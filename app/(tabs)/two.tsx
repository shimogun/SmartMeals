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

  // 献立生成用のstate
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
      
      // 献立生成を自動実行
      generateMeal(glucose, selectedMealType);
      
      setMealNote('');
    } catch (error) {
      console.error('データ保存エラー:', error);
      Alert.alert('エラー', 'データの保存に失敗しました');
    }
  };

  // 献立生成機能
  const generateMeal = async (glucoseValue: number, mealType: string) => {
    setIsGenerating(true);
    
    try {
      // 模擬的な献立生成（実際はAPIコールになる）
      await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5秒の待機
      
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
    } catch (error) {
      console.error('献立生成エラー:', error);
    } finally {
      setIsGenerating(false);
    }
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

  return (
    <SafeAreaView style={styles.container}>
      {/* 上半分：血糖値入力エリア */}
      <View style={styles.inputSection}>
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

          {/* 日時・食事タイプ */}
          <View style={styles.metaInfo}>
            <TouchableOpacity 
              style={styles.metaButton}
              onPress={() => setShowMealModal(true)}
            >
              <Text style={styles.metaText}>{selectedMealType}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.recordButton} onPress={saveRecord}>
            <Text style={styles.recordButtonText}>記録して献立生成</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 下半分：献立生成エリア */}
      <View style={styles.mealSection}>
        <Text style={styles.sectionTitle}>おすすめ献立</Text>
        
        {isGenerating ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>献立を生成中...</Text>
          </View>
        ) : mealSuggestions.length > 0 ? (
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
        ) : (
          <View style={styles.emptyMealContainer}>
            <Text style={styles.emptyMealText}>血糖値を記録すると</Text>
            <Text style={styles.emptyMealText}>献立を自動生成します</Text>
          </View>
        )}
      </View>

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
  inputSection: {
    flex: 0.5,
    padding: 20,
    paddingTop: 40,
  },
  mealSection: {
    flex: 0.5,
    padding: 20,
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  suggestionsContainer: {
    flex: 1,
  },
  mealCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
  },
  mealName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  mealDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  nutritionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nutritionText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  emptyMealContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyMealText: {
    fontSize: 16,
    color: '#ccc',
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
});
