import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

type GlucoseRecord = {
  id: string;
  value: number;
  timestamp: number;
  date: string;
  mealType: string;
  mealNote: string;
  userId?: string;
};

type WeeklyRecord = {
  id: string;
  weekStart: string;
  weight: number | null;
  exercise: 'high' | 'normal' | 'low' | null;
  condition: 'good' | 'normal' | 'poor' | null;
  hba1c: number | null;
  timestamp: number;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  userId?: string;
};

export default function RecordScreen() {
  const router = useRouter();
  const [glucoseValue, setGlucoseValue] = useState('');
  const [weightValue, setWeightValue] = useState('');
  const [mealType, setMealType] = useState<string>('朝');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const storedUsers = await AsyncStorage.getItem('users');
      if (storedUsers) {
        const users = JSON.parse(storedUsers);
        if (users.length > 0) {
          // 現在選択されているユーザーIDを取得（なければ最初のユーザー）
          const currentIndex = await AsyncStorage.getItem('currentUserIndex');
          const index = currentIndex ? parseInt(currentIndex) : 0;
          setCurrentUserId(users[index]?.id || users[0].id);
        }
      }
    } catch (error) {
      console.error('ユーザー読み込みエラー:', error);
    }
  };

  const saveRecord = async () => {
    if (!glucoseValue && !weightValue) {
      Alert.alert('入力エラー', '血糖値または体重を入力してください');
      return;
    }

    try {
      // 血糖値の保存
      if (glucoseValue) {
        const glucose = parseFloat(glucoseValue);
        if (isNaN(glucose) || glucose < 20 || glucose > 600) {
          Alert.alert('入力エラー', '血糖値は20〜600 mg/dLの範囲で入力してください');
          return;
        }

        const newRecord: GlucoseRecord = {
          id: Date.now().toString(),
          value: glucose,
          timestamp: Date.now(),
          date: new Date().toISOString().split('T')[0],
          mealType: mealType,
          mealNote: '',
          userId: currentUserId,
        };

        const storedRecords = await AsyncStorage.getItem('glucose_records');
        const records = storedRecords ? JSON.parse(storedRecords) : [];
        records.push(newRecord);
        await AsyncStorage.setItem('glucose_records', JSON.stringify(records));
      }

      // 体重の保存
      if (weightValue) {
        const weight = parseFloat(weightValue);
        if (isNaN(weight) || weight < 20 || weight > 300) {
          Alert.alert('入力エラー', '体重は20〜300 kgの範囲で入力してください');
          return;
        }

        const getCurrentWeekStart = () => {
          const today = new Date();
          const dayOfWeek = today.getDay();
          const mondayDate = new Date(today);
          mondayDate.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
          return mondayDate.toISOString().split('T')[0];
        };

        const newWeeklyRecord: WeeklyRecord = {
          id: Date.now().toString(),
          weekStart: getCurrentWeekStart(),
          weight: weight,
          exercise: null,
          condition: null,
          hba1c: null,
          timestamp: Date.now(),
          userId: currentUserId,
        };

        const storedWeekly = await AsyncStorage.getItem('weekly_records');
        const weeklyRecords = storedWeekly ? JSON.parse(storedWeekly) : [];
        weeklyRecords.push(newWeeklyRecord);
        await AsyncStorage.setItem('weekly_records', JSON.stringify(weeklyRecords));
      }

      // 保存成功
      const savedItems = [];
      if (glucoseValue) savedItems.push(`血糖値: ${glucoseValue} mg/dL`);
      if (weightValue) savedItems.push(`体重: ${weightValue} kg`);

      Alert.alert('記録完了', savedItems.join('\n'), [
        { text: 'OK', onPress: () => {
          setGlucoseValue('');
          setWeightValue('');
          router.back();
        }}
      ]);

    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', '記録の保存に失敗しました');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>記録</Text>
        <Text style={styles.subtitle}>どちらか一方だけでもOK</Text>

        {/* 血糖値入力 */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>血糖値</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.numberInput}
              value={glucoseValue}
              onChangeText={setGlucoseValue}
              placeholder="142"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
            <Text style={styles.unit}>mg/dL</Text>
          </View>

          {/* 食事タイミング */}
          {glucoseValue ? (
            <View style={styles.mealTypeContainer}>
              <Text style={styles.mealTypeLabel}>タイミング:</Text>
              <View style={styles.mealTypeButtons}>
                {['朝', '昼', '夜'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.mealTypeButton,
                      mealType === type && styles.mealTypeButtonActive
                    ]}
                    onPress={() => setMealType(type)}
                  >
                    <Text style={[
                      styles.mealTypeText,
                      mealType === type && styles.mealTypeTextActive
                    ]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        {/* 体重入力 */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>体重</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.numberInput}
              value={weightValue}
              onChangeText={setWeightValue}
              placeholder="68.5"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
            <Text style={styles.unit}>kg</Text>
          </View>
        </View>

        {/* 保存ボタン */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!glucoseValue && !weightValue) && styles.saveButtonDisabled
          ]}
          onPress={saveRecord}
          disabled={!glucoseValue && !weightValue}
        >
          <Text style={styles.saveButtonText}>保存</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    fontSize: 24,
    backgroundColor: '#f8f9fa',
    color: '#333',
    textAlign: 'left',
  },
  unit: {
    fontSize: 18,
    color: '#666',
    marginLeft: 15,
    width: 60,
  },
  mealTypeContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  mealTypeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  mealTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  mealTypeButton: {
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  mealTypeButtonActive: {
    backgroundColor: '#007AFF',
  },
  mealTypeText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  mealTypeTextActive: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 15,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
});
