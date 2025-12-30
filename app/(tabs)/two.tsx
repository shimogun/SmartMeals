import { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, PanResponder, Alert, Platform, TextInput, Modal, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

type GlucoseRecord = {
  id: string;
  value: number;
  timestamp: number;
  date: string;
  mealType: string;
  mealNote: string;
};

type MealSuggestion = {
  id: string;
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  description: string;
};


const { height } = Dimensions.get('window');

export default function MealScreen() {
  // 血糖値入力用のstate
  const [glucose, setGlucose] = useState(100);
  const [records, setRecords] = useState<GlucoseRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('空腹時');
  const [mealNote, setMealNote] = useState('');
  const [showMealModal, setShowMealModal] = useState(false);

  // ステップコントロール用
  const [currentStep, setCurrentStep] = useState(1); // 1: 入力, 2: 生成中, 3: 結果
  const [mealSuggestions, setMealSuggestions] = useState<MealSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);


  const mealTypes = ['空腹時', '朝食前', '朝食後', '昼食前', '昼食後', '夕食前', '夕食後', '就寝前'];
  
  // 血糖値スワイプ用
  const lastUpdateX = useRef(0);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const stored = await AsyncStorage.getItem('glucose_records');
      if (stored) {
        setRecords(JSON.parse(stored));
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    }
  };

  // 血糖値記録保存
  const saveRecord = async () => {
    const newRecord: GlucoseRecord = {
      id: Date.now().toString(),
      value: glucose,
      timestamp: selectedDate.getTime(),
      date: selectedDate.toISOString().split('T')[0],
      mealType: selectedMealType,
      mealNote: mealNote
    };

    try {
      const newRecords = [...records, newRecord];
      await AsyncStorage.setItem('glucose_records', JSON.stringify(newRecords));
      setRecords(newRecords);
      
      Alert.alert(
        '記録完了',
        `血糖値 ${glucose} mg/dL を記録しました`,
        [{ text: 'OK' }]
      );
      
      setMealNote('');
    } catch (error) {
      console.error('データ保存エラー:', error);
      Alert.alert('エラー', 'データの保存に失敗しました');
    }
  };

  // 献立生成機能
  const generateMeal = async (glucoseValue: number, mealType: string) => {
    setCurrentStep(2); // 生成中ステップに移行
    setIsGenerating(true);
    
    try {
      // 模擬的な献立生成（実際はAPIコールになる）
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒の待機
      
      const suggestions: MealSuggestion[] = [
        {
          id: '1',
          name: '鶏胸肉のソテー',
          calories: 250,
          carbs: 5,
          protein: 35,
          fat: 8,
          description: '低糖質・高タンパク質で血糖値上昇を抑制'
        },
        {
          id: '2', 
          name: 'キノコのサラダ',
          calories: 80,
          carbs: 12,
          protein: 4,
          fat: 2,
          description: '食物繊維豊富で血糖値の急上昇を防ぐ'
        },
        {
          id: '3',
          name: '玄米ご飯（少量）',
          calories: 120,
          carbs: 25,
          protein: 3,
          fat: 1,
          description: '血糖値に配慮した適量の炭水化物'
        }
      ];
      
      setMealSuggestions(suggestions);
      setCurrentStep(3); // 結果ステップに移行
    } catch (error) {
      console.error('献立生成エラー:', error);
      Alert.alert('エラー', '献立生成に失敗しました');
      setCurrentStep(1); // エラー時は入力ステップに戻る
    } finally {
      setIsGenerating(false);
    }
  };

  // 記録して献立生成
  const saveRecordAndGenerate = async () => {
    try {
      // まず血糖値を記録
      const newRecord: GlucoseRecord = {
        id: Date.now().toString(),
        value: glucose,
        timestamp: selectedDate.getTime(),
        date: selectedDate.toISOString().split('T')[0],
        mealType: selectedMealType,
        mealNote: mealNote
      };

      const newRecords = [...records, newRecord];
      await AsyncStorage.setItem('glucose_records', JSON.stringify(newRecords));
      setRecords(newRecords);
      
      // 献立生成を開始
      generateMeal(glucose, selectedMealType);
      
      setMealNote('');
    } catch (error) {
      console.error('データ保存エラー:', error);
      Alert.alert('エラー', 'データの保存に失敗しました');
    }
  };

  // 最初に戻る
  const resetToStart = () => {
    setCurrentStep(1);
    setMealSuggestions([]);
  };

  // 血糖値スワイプジェスチャー
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        lastUpdateX.current = 0;
      },
      onPanResponderMove: (evt, gestureState) => {
        const threshold = 1;
        const distance = gestureState.dx - lastUpdateX.current;

        if (Math.abs(distance) >= threshold) {
          const direction = distance > 0 ? 1 : -1;
          
          setGlucose(prev => {
            const next = prev + direction;
            return Math.max(50, Math.min(400, next));
          });

          lastUpdateX.current = gestureState.dx;
        }
      },
      onPanResponderRelease: () => {
        lastUpdateX.current = 0;
      },
    })
  ).current;

  // 日時選択
  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      const newDate = new Date(selectedDate);
      newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setSelectedDate(newDate);
    }
  };

  const onTimeChange = (event: any, time?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (time) {
      const newDate = new Date(selectedDate);
      newDate.setHours(time.getHours(), time.getMinutes());
      setSelectedDate(newDate);
    }
  };

  // プログレスインジケーター
  const renderProgressIndicator = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressSteps}>
        <View style={[styles.progressStep, currentStep >= 1 && styles.progressStepActive]}>
          <Text style={[styles.progressStepText, currentStep >= 1 && styles.progressStepTextActive]}>1</Text>
        </View>
        <View style={[styles.progressLine, currentStep >= 2 && styles.progressLineActive]} />
        <View style={[styles.progressStep, currentStep >= 2 && styles.progressStepActive]}>
          <Text style={[styles.progressStepText, currentStep >= 2 && styles.progressStepTextActive]}>2</Text>
        </View>
        <View style={[styles.progressLine, currentStep >= 3 && styles.progressLineActive]} />
        <View style={[styles.progressStep, currentStep >= 3 && styles.progressStepActive]}>
          <Text style={[styles.progressStepText, currentStep >= 3 && styles.progressStepTextActive]}>3</Text>
        </View>
      </View>
      <View style={styles.progressLabels}>
        <Text style={styles.progressLabel}>入力</Text>
        <Text style={styles.progressLabel}>生成</Text>
        <Text style={styles.progressLabel}>結果</Text>
      </View>
    </View>
  );

  // ステップ1: 血糖値入力
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>血糖値を記録</Text>
      
      <View style={styles.glucoseInputCard}>
        <View style={styles.valueContainer}>
          <Text style={styles.valueText}>{glucose}</Text>
          <Text style={styles.unitText}>mg/dL</Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => setGlucose(p => Math.max(50, p - 1))}
          >
            <Text style={styles.buttonText}>-</Text>
          </TouchableOpacity>

          <View style={styles.flickArea} {...panResponder.panHandlers}>
            <View style={styles.flickTrack}>
              <Text style={styles.hintText}>◀ スライドで調整 ▶</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.button} 
            onPress={() => setGlucose(p => Math.min(400, p + 1))}
          >
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metaInfo}>
          <TouchableOpacity 
            style={styles.metaButton}
            onPress={() => setShowMealModal(true)}
          >
            <Text style={styles.metaText}>{selectedMealType}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.recordButton} onPress={saveRecordAndGenerate}>
          <Text style={styles.recordButtonText}>記録して献立生成</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ステップ2: 献立生成中
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>献立を生成中...</Text>
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>あなたの血糖値に最適な</Text>
        <Text style={styles.loadingText}>献立を生成しています</Text>
        <Text style={styles.loadingEmoji}>🍽️</Text>
      </View>
    </View>
  );

  // ステップ3: 献立結果
  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>おすすめ献立</Text>
      <View style={styles.suggestionsContainer}>
        {mealSuggestions.map((meal) => (
          <View key={meal.id} style={styles.mealCard}>
            <Text style={styles.mealName}>{meal.name}</Text>
            <Text style={styles.mealDescription}>{meal.description}</Text>
            <View style={styles.nutritionInfo}>
              <Text style={styles.nutritionText}>{meal.calories}kcal</Text>
              <Text style={styles.nutritionText}>炭水化物{meal.carbs}g</Text>
            </View>
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.resetButton} onPress={resetToStart}>
        <Text style={styles.resetButtonText}>新しく記録する</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderProgressIndicator()}
      
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}

      {/* モーダル */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
      
      {showTimePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      )}

      <Modal
        visible={showMealModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMealModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>食事タイミング</Text>
            
            {mealTypes.map((type, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.mealOption,
                  selectedMealType === type && styles.selectedMealOption
                ]}
                onPress={() => {
                  setSelectedMealType(type);
                  setShowMealModal(false);
                }}
              >
                <Text style={[
                  styles.mealOptionText,
                  selectedMealType === type && styles.selectedMealOptionText
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowMealModal(false)}
            >
              <Text style={styles.modalCloseText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  progressStep: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepActive: {
    backgroundColor: '#007AFF',
  },
  progressStepText: {
    fontSize: 14,
    color: '#999',
    fontWeight: 'bold',
  },
  progressStepTextActive: {
    color: '#fff',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 10,
  },
  progressLineActive: {
    backgroundColor: '#007AFF',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 15,
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  stepContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  glucoseInputCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  valueText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  unitText: {
    fontSize: 18,
    marginLeft: 8,
    color: '#666',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  button: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  flickArea: {
    flex: 1,
    height: 45,
    marginHorizontal: 15,
    justifyContent: 'center',
  },
  flickTrack: {
    backgroundColor: '#f0f0f0',
    height: 35,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintText: {
    color: '#999',
    fontSize: 11,
    fontWeight: 'bold',
  },
  metaInfo: {
    marginBottom: 20,
  },
  metaButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  metaText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  recordButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 30,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  mealOption: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 8,
  },
  selectedMealOption: {
    backgroundColor: '#007AFF',
  },
  mealOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  selectedMealOptionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalCloseButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  loadingEmoji: {
    fontSize: 48,
    marginTop: 20,
  },
  suggestionsContainer: {
    paddingHorizontal: 20,
  },
  mealCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  mealName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  mealDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  nutritionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nutritionText: {
    fontSize: 12,
    color: '#999',
  },
  resetButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginTop: 20,
    alignSelf: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
