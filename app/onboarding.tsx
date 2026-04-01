import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { User } from '../types';
import { FOOD_CATEGORIES } from '../constants/foodCategories';

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');

  // Step 2
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [hba1c, setHba1c] = useState('');

  // Step 3
  const [likedFoods, setLikedFoods] = useState<string[]>([]);
  const [dislikedFoods, setDislikedFoods] = useState<string[]>([]);

  const toggleFood = (food: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (list.includes(food)) {
      setList(list.filter(f => f !== food));
    } else {
      setList([...list, food]);
    }
  };

  const validateStep1 = (): boolean => {
    if (!name.trim()) {
      Alert.alert('入力エラー', '名前を入力してください');
      return false;
    }
    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      Alert.alert('入力エラー', '正しい年齢を入力してください');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (!height || isNaN(h) || h < 100 || h > 250) {
      Alert.alert('入力エラー', '正しい身長を入力してください（100-250cm）');
      return false;
    }
    if (!weight || isNaN(w) || w < 20 || w > 300) {
      Alert.alert('入力エラー', '正しい体重を入力してください（20-300kg）');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleComplete = async (skipFoodPreferences: boolean) => {
    try {
      const newUser: User = {
        id: Date.now().toString(),
        name: name.trim(),
        age: parseInt(age),
        avatar: '',
        createdAt: Date.now(),
        healthData: {
          height: parseFloat(height),
          weight: parseFloat(weight),
          gender,
          activityLevel: 'moderate',
        },
        foodPreferences: {
          liked: skipFoodPreferences ? [] : likedFoods,
          disliked: skipFoodPreferences ? [] : dislikedFoods,
        },
        onboardingCompleted: true,
      };

      if (hba1c) {
        const hba1cValue = parseFloat(hba1c);
        if (!isNaN(hba1cValue) && hba1cValue >= 3 && hba1cValue <= 20) {
          const weeklyRecord = {
            id: Date.now().toString(),
            weekStart: new Date().toISOString().split('T')[0],
            hba1c: hba1cValue,
            weight: parseFloat(weight),
            timestamp: Date.now(),
            userId: newUser.id,
          };
          await AsyncStorage.setItem('weekly_records', JSON.stringify([weeklyRecord]));
        }
      }

      await AsyncStorage.setItem('users', JSON.stringify([newUser]));
      await AsyncStorage.setItem('currentUserIndex', '0');

      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('エラー', '保存に失敗しました。もう一度お試しください。');
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>基本情報</Text>
      <Text style={styles.stepDescription}>あなたに合った献立を提案するために教えてください</Text>

      <Text style={styles.label}>名前</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="名前を入力"
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>年齢</Text>
      <TextInput
        style={styles.input}
        value={age}
        onChangeText={setAge}
        placeholder="年齢を入力"
        placeholderTextColor="#999"
        keyboardType="number-pad"
      />

      <Text style={styles.label}>性別</Text>
      <View style={styles.genderRow}>
        <TouchableOpacity
          style={[styles.genderButton, gender === 'male' && styles.genderSelected]}
          onPress={() => setGender('male')}
        >
          <Text style={[styles.genderText, gender === 'male' && styles.genderTextSelected]}>男性</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.genderButton, gender === 'female' && styles.genderSelected]}
          onPress={() => setGender('female')}
        >
          <Text style={[styles.genderText, gender === 'female' && styles.genderTextSelected]}>女性</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.nextButton, { flex: 0 }]} onPress={handleNext}>
        <Text style={styles.nextButtonText}>次へ</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>体の情報</Text>

      <Text style={styles.label}>身長 (cm)</Text>
      <TextInput
        style={styles.input}
        value={height}
        onChangeText={setHeight}
        placeholder="例: 170"
        placeholderTextColor="#999"
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>体重 (kg)</Text>
      <TextInput
        style={styles.input}
        value={weight}
        onChangeText={setWeight}
        placeholder="例: 65"
        placeholderTextColor="#999"
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>HbA1c（わかれば）</Text>
      <TextInput
        style={styles.input}
        value={hba1c}
        onChangeText={setHba1c}
        placeholder="例: 6.5"
        placeholderTextColor="#999"
        keyboardType="decimal-pad"
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>次へ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>食材の好み</Text>
      <Text style={styles.stepDescription}>
        好きな食材と苦手な食材を選んでください。献立に反映されます。
      </Text>

      <Text style={styles.sectionLabel}>好きな食材</Text>
      {Object.entries({ ...FOOD_CATEGORIES.mainIngredients, ...FOOD_CATEGORIES.sideIngredients }).map(
        ([category, foods]) => (
          <View key={category}>
            <Text style={styles.categoryLabel}>{category}</Text>
            <View style={styles.foodGrid}>
              {foods.map(food => (
                <TouchableOpacity
                  key={food}
                  style={[styles.foodChip, likedFoods.includes(food) && styles.foodChipLiked]}
                  onPress={() => toggleFood(food, likedFoods, setLikedFoods)}
                >
                  <Text style={[styles.foodChipText, likedFoods.includes(food) && styles.foodChipTextSelected]}>
                    {food}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )
      )}

      <Text style={[styles.sectionLabel, { marginTop: 20 }]}>苦手な食材</Text>
      {Object.entries({ ...FOOD_CATEGORIES.mainIngredients, ...FOOD_CATEGORIES.sideIngredients }).map(
        ([category, foods]) => (
          <View key={`dislike-${category}`}>
            <Text style={styles.categoryLabel}>{category}</Text>
            <View style={styles.foodGrid}>
              {foods.map(food => (
                <TouchableOpacity
                  key={food}
                  style={[styles.foodChip, dislikedFoods.includes(food) && styles.foodChipDisliked]}
                  onPress={() => toggleFood(food, dislikedFoods, setDislikedFoods)}
                >
                  <Text style={[styles.foodChipText, dislikedFoods.includes(food) && styles.foodChipTextSelected]}>
                    {food}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={() => handleComplete(false)}>
          <Text style={styles.nextButtonText}>完了</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.skipButton} onPress={() => handleComplete(true)}>
        <Text style={styles.skipButtonText}>スキップ（あとで設定から登録できます）</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.stepIndicator}>
          {[1, 2, 3].map(s => (
            <View
              key={s}
              style={[styles.stepDot, s === step && styles.stepDotActive, s < step && styles.stepDotCompleted]}
            />
          ))}
        </View>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 8,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ddd',
  },
  stepDotActive: {
    backgroundColor: '#007AFF',
    width: 24,
  },
  stepDotCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  genderSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  genderText: {
    fontSize: 16,
    color: '#333',
  },
  genderTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 30,
    flex: 1,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 30,
    flex: 1,
  },
  backButtonText: {
    color: '#333',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  skipButtonText: {
    color: '#999',
    fontSize: 14,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginTop: 8,
    marginBottom: 6,
  },
  foodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  foodChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  foodChipLiked: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  foodChipDisliked: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  foodChipText: {
    fontSize: 14,
    color: '#333',
  },
  foodChipTextSelected: {
    fontWeight: '600',
  },
});
