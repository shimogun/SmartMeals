import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlucoseRecord, WeeklyRecord, SavedMealPlan } from '../types';

const BOM = '\uFEFF';

class DataExportService {
  async exportAll(userId: string): Promise<void> {
    const timestamp = new Date().toISOString().slice(0, 10);
    const files: string[] = [];

    const glucoseCsv = await this.buildGlucoseCsv(userId);
    if (glucoseCsv) {
      const file = new File(Paths.cache, `glucose_${timestamp}.csv`);
      file.write(BOM + glucoseCsv);
      files.push(file.uri);
    }

    const weeklyCsv = await this.buildWeeklyCsv(userId);
    if (weeklyCsv) {
      const file = new File(Paths.cache, `weekly_${timestamp}.csv`);
      file.write(BOM + weeklyCsv);
      files.push(file.uri);
    }

    const mealsCsv = await this.buildMealsCsv(userId);
    if (mealsCsv) {
      const file = new File(Paths.cache, `meals_${timestamp}.csv`);
      file.write(BOM + mealsCsv);
      files.push(file.uri);
    }

    if (files.length === 0) {
      throw new Error('エクスポートするデータがありません');
    }

    for (const fileUri of files) {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
      }
    }
  }

  private async buildGlucoseCsv(userId: string): Promise<string | null> {
    try {
      const data = await AsyncStorage.getItem('glucose_records');
      if (!data) return null;
      const records: GlucoseRecord[] = JSON.parse(data).filter((r: GlucoseRecord) => r.userId === userId);
      if (records.length === 0) return null;

      const header = '日時,血糖値(mg/dL),食事タイミング,メモ';
      const rows = records
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(r => {
          const date = new Date(r.timestamp).toLocaleString('ja-JP');
          return `${date},${r.value},${r.mealType},${this.escapeCsv(r.mealNote || '')}`;
        });
      return [header, ...rows].join('\n');
    } catch {
      return null;
    }
  }

  private async buildWeeklyCsv(userId: string): Promise<string | null> {
    try {
      const data = await AsyncStorage.getItem('weekly_records');
      if (!data) return null;
      const records: WeeklyRecord[] = JSON.parse(data).filter((r: WeeklyRecord) => r.userId === userId);
      if (records.length === 0) return null;

      const header = '週開始日,体重(kg),HbA1c(%),血圧(収縮/拡張),運動,体調';
      const rows = records
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(r => {
          const bp = r.bloodPressure ? `${r.bloodPressure.systolic}/${r.bloodPressure.diastolic}` : '';
          return `${r.weekStart},${r.weight ?? ''},${r.hba1c ?? ''},${bp},${this.escapeCsv(r.exercise || '')},${this.escapeCsv(r.condition || '')}`;
        });
      return [header, ...rows].join('\n');
    } catch {
      return null;
    }
  }

  private async buildMealsCsv(userId: string): Promise<string | null> {
    try {
      const data = await AsyncStorage.getItem('saved_meal_plans');
      if (!data) return null;
      const plans: SavedMealPlan[] = JSON.parse(data).filter((p: SavedMealPlan) => p.userId === userId);
      if (plans.length === 0) return null;

      const header = '日付,食事名,カロリー(kcal),糖質(g),たんぱく質(g),脂質(g)';
      const rows: string[] = [];
      for (const plan of plans) {
        for (const [date, meals] of Object.entries(plan.meals)) {
          for (const meal of meals) {
            rows.push(`${date},${this.escapeCsv(meal.name)},${meal.calories},${meal.carbs},${meal.protein},${meal.fat}`);
          }
        }
      }
      if (rows.length === 0) return null;
      return [header, ...rows].join('\n');
    } catch {
      return null;
    }
  }

  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

const dataExportService = new DataExportService();
export default dataExportService;
