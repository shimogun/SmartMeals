import { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Dimensions, Modal, TextInput, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  runOnJS, 
  withSpring,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

type User = {
  id: string;
  name: string;
  age: number;
  avatar: string;
  createdAt: number;
  healthData?: {
    height?: number; // cm
    weight?: number; // kg
    gender?: 'male' | 'female';
    activityLevel?: 'light' | 'moderate' | 'high';
  };
};


const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');
  
  // 健康情報用のstate
  const [healthHeight, setHealthHeight] = useState('');
  const [healthWeight, setHealthWeight] = useState('');
  const [healthGender, setHealthGender] = useState<'male' | 'female'>('male');
  const [healthActivity, setHealthActivity] = useState<'light' | 'moderate' | 'high'>('moderate');
  const [selectedHealthUserIndex, setSelectedHealthUserIndex] = useState(0);

  // スワイプアニメーション用
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

 // データの読み込み
 useEffect(() => {
   loadData();
 }, []);

 const loadData = async () => {
   try {
     // ユーザーデータ読み込み
     const storedUsers = await AsyncStorage.getItem('users');
     if (storedUsers) {
       setUsers(JSON.parse(storedUsers));
     } else {
       // 初回起動時のサンプルユーザー
       const defaultUser: User = {
         id: Date.now().toString(),
         name: 'あなた',
         age: 30,
         avatar: '👤',
         createdAt: Date.now()
       };
       setUsers([defaultUser]);
       await AsyncStorage.setItem('users', JSON.stringify([defaultUser]));
     }
   } catch (error) {
     console.error('データ読み込みエラー:', error);
   }
 };

 // ユーザー切り替え
 const switchUser = (direction: number) => {
   if (users.length <= 1) return;
   
   setCurrentUserIndex(prev => {
     const newIndex = prev + direction;
     if (newIndex < 0) return users.length - 1;
     if (newIndex >= users.length) return 0;
     return newIndex;
   });
 };

// Tinder風スワイプアニメーション付きユーザー切り替え
const switchUserWithAnimation = (direction: number) => {
  if (users.length <= 1) return;

  // カードを画面外に飛ばすアニメーション
  const targetX = direction > 0 ? -width * 1.5 : width * 1.5;
  const targetRotation = direction > 0 ? -30 : 30;
  
  translateX.value = withSpring(targetX, { duration: 300 });
  rotate.value = withSpring(targetRotation, { duration: 300 });
  scale.value = withSpring(0.8, { duration: 300 });
  opacity.value = withSpring(0, { duration: 300 });
  
  // アニメーション完了後にユーザー切り替え
  setTimeout(() => {
    switchUser(direction);
    
    // 新しいカードを反対側から登場させる
    translateX.value = direction > 0 ? width * 0.3 : -width * 0.3;
    rotate.value = direction > 0 ? 15 : -15;
    scale.value = 0.9;
    opacity.value = 0;
    
    // 正常位置に戻すアニメーション
    translateX.value = withSpring(0, { duration: 400 });
    translateY.value = withSpring(0, { duration: 400 });
    rotate.value = withSpring(0, { duration: 400 });
    scale.value = withSpring(1, { duration: 400 });
    opacity.value = withSpring(1, { duration: 400 });
  }, 300);
};

// Tinder風パンジェスチャー
const panGesture = Gesture.Pan()
  .onUpdate((event) => {
    translateX.value = event.translationX;
    translateY.value = event.translationY;
    
    // スワイプ方向に応じた回転
    const rotationIntensity = Math.min(Math.abs(event.translationX) / width, 1);
    const rotationDirection = event.translationX > 0 ? 1 : -1;
    rotate.value = rotationDirection * rotationIntensity * 15;
    
    // スワイプ中の視覚効果
    const progress = Math.abs(event.translationX) / (width * 0.4);
    scale.value = interpolate(
      progress,
      [0, 1],
      [1, 0.95],
      Extrapolate.CLAMP
    );
    opacity.value = interpolate(
      progress,
      [0, 1],
      [1, 0.8],
      Extrapolate.CLAMP
    );
  })
  .onEnd((event) => {
    const threshold = width * 0.3;
    const velocity = Math.abs(event.velocityX);
    
    // 速度または距離でスワイプ判定
    if (Math.abs(event.translationX) > threshold || velocity > 500) {
      // スワイプが成功
      const direction = event.translationX > 0 ? -1 : 1;
      runOnJS(switchUserWithAnimation)(direction);
    } else {
      // スワイプ失敗：元の位置に戻す
      translateX.value = withSpring(0, { duration: 400 });
      translateY.value = withSpring(0, { duration: 400 });
      rotate.value = withSpring(0, { duration: 400 });
      scale.value = withSpring(1, { duration: 400 });
      opacity.value = withSpring(1, { duration: 400 });
    }
  });

// Tinder風アニメーションスタイル
const animatedCardStyle = useAnimatedStyle(() => {
  return {
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value }
    ],
    opacity: opacity.value,
  };
});


 // プロフィール編集を開始
 const startEditProfile = () => {
   const user = users[currentUserIndex];
   setEditName(user.name);
   setEditAge(user.age.toString());
   setShowEditProfile(true);
 };

 // 健康情報編集を開始
 const startEditHealth = () => {
   setSelectedHealthUserIndex(currentUserIndex); // 現在のユーザーを初期選択
   const user = users[currentUserIndex];
   const health = user.healthData || {};
   setHealthHeight(health.height?.toString() || '');
   setHealthWeight(health.weight?.toString() || '');
   setHealthGender(health.gender || 'male');
   setHealthActivity(health.activityLevel || 'moderate');
   setShowHealthModal(true);
 };

 // ユーザー詳細表示を開始
 const showUserDetail = () => {
   setShowUserDetailModal(true);
 };

 // ユーザー選択時に健康情報を更新
 const onHealthUserChange = (userIndex: number) => {
   setSelectedHealthUserIndex(userIndex);
   const user = users[userIndex];
   const health = user.healthData || {};
   setHealthHeight(health.height?.toString() || '');
   setHealthWeight(health.weight?.toString() || '');
   setHealthGender(health.gender || 'male');
   setHealthActivity(health.activityLevel || 'moderate');
 };

 // プロフィール保存
 const saveProfile = async () => {
   if (!editName.trim()) {
     Alert.alert('エラー', '名前を入力してください');
     return;
   }
   
   const ageNum = parseInt(editAge);
   if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
     Alert.alert('エラー', '正しい年齢を入力してください');
     return;
   }

   try {
     const updatedUsers = [...users];
     updatedUsers[currentUserIndex] = {
       ...updatedUsers[currentUserIndex],
       name: editName.trim(),
       age: ageNum
     };
     
     setUsers(updatedUsers);
     await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
     setShowEditProfile(false);
     
     Alert.alert('保存完了', 'プロフィールを更新しました');
   } catch (error) {
     console.error('保存エラー:', error);
     Alert.alert('エラー', 'プロフィールの保存に失敗しました');
   }
 };

 // 健康情報保存
 const saveHealthData = async () => {
   try {
     const height = parseFloat(healthHeight);
     const weight = parseFloat(healthWeight);

     if (healthHeight && (isNaN(height) || height < 100 || height > 250)) {
       Alert.alert('エラー', '身長は100〜250cmの範囲で入力してください');
       return;
     }
     
     if (healthWeight && (isNaN(weight) || weight < 30 || weight > 200)) {
       Alert.alert('エラー', '体重は30〜200kgの範囲で入力してください');
       return;
     }

     const updatedUsers = [...users];
     const targetUser = users[selectedHealthUserIndex];
     updatedUsers[selectedHealthUserIndex] = {
       ...updatedUsers[selectedHealthUserIndex],
       healthData: {
         height: healthHeight ? height : undefined,
         weight: healthWeight ? weight : undefined,
         gender: healthGender,
         activityLevel: healthActivity
       }
     };
     
     setUsers(updatedUsers);
     await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
     setShowHealthModal(false);
     
     Alert.alert('保存完了', `${targetUser.name}の基本健康情報を更新しました`);
   } catch (error) {
     console.error('健康情報保存エラー:', error);
     Alert.alert('エラー', '健康情報の保存に失敗しました');
   }
 };

 // 新しいユーザーを追加
 const addNewUser = async () => {
   if (!newName.trim()) {
     Alert.alert('エラー', '名前を入力してください');
     return;
   }
   
   const ageNum = parseInt(newAge);
   if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
     Alert.alert('エラー', '正しい年齢を入力してください');
     return;
   }

   try {
     const newUser: User = {
       id: Date.now().toString(),
       name: newName.trim(),
       age: ageNum,
       avatar: '👤',
       createdAt: Date.now()
     };
     
     const updatedUsers = [...users, newUser];
     setUsers(updatedUsers);
     await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
     
     // 新しく追加したユーザーに切り替え
     setCurrentUserIndex(updatedUsers.length - 1);
     
     setShowAddUser(false);
     setNewName('');
     setNewAge('');
     
     Alert.alert('追加完了', `${newName.trim()} を追加しました`);
   } catch (error) {
     console.error('ユーザー追加エラー:', error);
     Alert.alert('エラー', 'ユーザーの追加に失敗しました');
   }
 };

  const currentUser = users.length > 0 ? users[currentUserIndex] : null;

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ color: '#fff', textAlign: 'center', marginTop: 100 }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.swipeContainer}>
        {/* メインプロフィールカード */}
        <GestureDetector gesture={panGesture}>
          <TouchableOpacity
            style={styles.cardTouchable}
            onPress={showUserDetail}
            activeOpacity={0.9}
          >
            <Animated.View style={[styles.profileCard, animatedCardStyle]}>
              {/* アバター */}
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarEmoji}>{currentUser.avatar}</Text>
              </View>
              
              {/* ユーザー名 */}
              <Text style={styles.userName}>{currentUser.name}</Text>
              <Text style={styles.userAge}>{currentUser.age}歳</Text>
            </Animated.View>
          </TouchableOpacity>
        </GestureDetector>


        {/* アクションボタン */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={startEditProfile}
          >
            <Text style={styles.actionButtonText}>プロフィール編集</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.healthButton]}
            onPress={startEditHealth}
          >
            <Text style={styles.healthButtonText}>健康情報設定</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.addButton]}
            onPress={() => setShowAddUser(true)}
          >
            <Text style={styles.addButtonText}>+ ユーザーを追加</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* プロフィール編集モーダル */}
      <Modal
        visible={showEditProfile}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditProfile(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <Text style={styles.editModalTitle}>プロフィール編集</Text>
            
            <View style={styles.editFieldContainer}>
              <Text style={styles.fieldLabel}>名前</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="名前を入力"
                placeholderTextColor="#999"
              />
            </View>
            
            <View style={styles.editFieldContainer}>
              <Text style={styles.fieldLabel}>年齢</Text>
              <TextInput
                style={styles.textInput}
                value={editAge}
                onChangeText={setEditAge}
                placeholder="年齢を入力"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.editButtonContainer}>
              <TouchableOpacity
                style={[styles.editButton, styles.cancelButton]}
                onPress={() => setShowEditProfile(false)}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.editButton, styles.saveButton]}
                onPress={saveProfile}
              >
                <Text style={styles.saveButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ユーザー追加モーダル */}
      <Modal
        visible={showAddUser}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddUser(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <Text style={styles.editModalTitle}>ユーザー追加</Text>
            
            <View style={styles.editFieldContainer}>
              <Text style={styles.fieldLabel}>名前</Text>
              <TextInput
                style={styles.textInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="名前を入力"
                placeholderTextColor="#999"
              />
            </View>
            
            <View style={styles.editFieldContainer}>
              <Text style={styles.fieldLabel}>年齢</Text>
              <TextInput
                style={styles.textInput}
                value={newAge}
                onChangeText={setNewAge}
                placeholder="年齢を入力"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.editButtonContainer}>
              <TouchableOpacity
                style={[styles.editButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddUser(false);
                  setNewName('');
                  setNewAge('');
                }}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.editButton, styles.saveButton]}
                onPress={addNewUser}
              >
                <Text style={styles.saveButtonText}>追加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 健康情報入力モーダル（カルテ風） */}
      <Modal
        visible={showHealthModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowHealthModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.healthModalContent}>
            <Text style={styles.healthModalTitle}>健康カルテ</Text>
            <Text style={styles.healthSubtitle}>糖尿病管理に必要な情報を入力してください</Text>
            
            <ScrollView style={styles.healthScrollView} showsVerticalScrollIndicator={false}>
              {/* ユーザー選択セクション */}
              {users.length > 1 && (
                <View style={styles.healthSection}>
                  <Text style={styles.healthSectionTitle}>👤 対象ユーザー</Text>
                  <View style={styles.userSelectionContainer}>
                    {users.map((user, index) => (
                      <TouchableOpacity
                        key={user.id}
                        style={[
                          styles.userSelectionOption,
                          selectedHealthUserIndex === index && styles.userSelectionOptionActive
                        ]}
                        onPress={() => onHealthUserChange(index)}
                      >
                        <Text style={styles.userSelectionEmoji}>{user.avatar}</Text>
                        <Text style={[
                          styles.userSelectionName,
                          selectedHealthUserIndex === index && styles.userSelectionNameActive
                        ]}>{user.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* 基本情報セクション */}
              <View style={styles.healthSection}>
                <Text style={styles.healthSectionTitle}>📊 基本情報</Text>
                
                <View style={styles.healthRow}>
                  <Text style={styles.healthLabel}>身長 (cm)</Text>
                  <TextInput
                    style={styles.healthInput}
                    value={healthHeight}
                    onChangeText={setHealthHeight}
                    placeholder="170"
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.healthRow}>
                  <Text style={styles.healthLabel}>体重 (kg)</Text>
                  <TextInput
                    style={styles.healthInput}
                    value={healthWeight}
                    onChangeText={setHealthWeight}
                    placeholder="65"
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.healthRow}>
                  <Text style={styles.healthLabel}>性別</Text>
                  <View style={styles.genderContainer}>
                    <TouchableOpacity
                      style={[styles.genderButton, healthGender === 'male' && styles.genderButtonActive]}
                      onPress={() => setHealthGender('male')}
                    >
                      <Text style={[styles.genderText, healthGender === 'male' && styles.genderTextActive]}>男性</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.genderButton, healthGender === 'female' && styles.genderButtonActive]}
                      onPress={() => setHealthGender('female')}
                    >
                      <Text style={[styles.genderText, healthGender === 'female' && styles.genderTextActive]}>女性</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>


              {/* 活動レベルセクション */}
              <View style={styles.healthSection}>
                <Text style={styles.healthSectionTitle}>🏃‍♀️ 運動レベル</Text>
                
                <TouchableOpacity
                  style={[styles.activityOption, healthActivity === 'light' && styles.activityOptionActive]}
                  onPress={() => setHealthActivity('light')}
                >
                  <Text style={[styles.activityTitle, healthActivity === 'light' && styles.activityTitleActive]}>軽度</Text>
                  <Text style={styles.activityDescription}>デスクワーク中心、運動習慣なし</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.activityOption, healthActivity === 'moderate' && styles.activityOptionActive]}
                  onPress={() => setHealthActivity('moderate')}
                >
                  <Text style={[styles.activityTitle, healthActivity === 'moderate' && styles.activityTitleActive]}>中程度</Text>
                  <Text style={styles.activityDescription}>立ち仕事、週2-3回の軽い運動</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.activityOption, healthActivity === 'high' && styles.activityOptionActive]}
                  onPress={() => setHealthActivity('high')}
                >
                  <Text style={[styles.activityTitle, healthActivity === 'high' && styles.activityTitleActive]}>高度</Text>
                  <Text style={styles.activityDescription}>肉体労働、週4回以上の運動習慣</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            
            <View style={styles.healthButtonContainer}>
              <TouchableOpacity
                style={[styles.editButton, styles.cancelButton]}
                onPress={() => setShowHealthModal(false)}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.editButton, styles.saveButton]}
                onPress={saveHealthData}
              >
                <Text style={styles.saveButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ユーザー詳細表示モーダル */}
      <Modal
        visible={showUserDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUserDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <Text style={styles.detailModalTitle}>{currentUser.name} の詳細情報</Text>
            
            <ScrollView style={styles.detailScrollView} showsVerticalScrollIndicator={false}>
              {/* 基本情報 */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>👤 基本情報</Text>
                <Text style={styles.detailItem}>名前: {currentUser.name}</Text>
                <Text style={styles.detailItem}>年齢: {currentUser.age}歳</Text>
              </View>

              {/* 健康情報 */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>🏥 健康情報</Text>
                {currentUser.healthData ? (
                  <>
                    {currentUser.healthData.height && (
                      <Text style={styles.detailItem}>身長: {currentUser.healthData.height}cm</Text>
                    )}
                    {currentUser.healthData.weight && (
                      <Text style={styles.detailItem}>体重: {currentUser.healthData.weight}kg</Text>
                    )}
                    {currentUser.healthData.height && currentUser.healthData.weight && (
                      <Text style={styles.detailItem}>
                        BMI: {(currentUser.healthData.weight / Math.pow(currentUser.healthData.height / 100, 2)).toFixed(1)}
                      </Text>
                    )}
                    <Text style={styles.detailItem}>
                      性別: {currentUser.healthData.gender === 'male' ? '男性' : '女性'}
                    </Text>
                    <Text style={styles.detailItem}>
                      運動レベル: {
                        currentUser.healthData.activityLevel === 'light' ? '軽度' :
                        currentUser.healthData.activityLevel === 'moderate' ? '中程度' : '高度'
                      }
                    </Text>
                  </>
                ) : (
                  <Text style={styles.noHealthData}>健康情報が未設定です</Text>
                )}
              </View>
            </ScrollView>
            
            <TouchableOpacity
              style={styles.detailCloseButton}
              onPress={() => setShowUserDetailModal(false)}
            >
              <Text style={styles.detailCloseText}>閉じる</Text>
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
    backgroundColor: '#000',
    paddingHorizontal: 20,
  },
  swipeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    width: width * 0.85,
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarEmoji: {
    fontSize: 60,
  },
  userName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#333',
    marginBottom: 5,
  },
  userAge: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },
  actionButtons: {
    marginTop: 40,
    width: width * 0.85,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingVertical: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#007AFF',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: width * 0.85,
    maxWidth: 400,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  editFieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#333',
  },
  editButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  editButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    marginLeft: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  healthButton: {
    backgroundColor: '#28a745',
  },
  healthButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  healthModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxHeight: '90%',
  },
  healthModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
    color: '#333',
  },
  healthSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    fontStyle: 'italic',
  },
  healthScrollView: {
    maxHeight: '75%',
  },
  healthSection: {
    marginBottom: 25,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
  },
  healthSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  healthRow: {
    marginBottom: 15,
  },
  healthLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  healthInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  healthNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
  genderContainer: {
    flexDirection: 'row',
  },
  genderButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  genderText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  genderTextActive: {
    color: '#fff',
  },
  activityOption: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  activityOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  activityTitleActive: {
    color: '#fff',
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
  },
  healthButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cardTouchable: {
    width: width * 0.85,
    alignItems: 'center',
  },
  userSelectionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  userSelectionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    margin: 5,
    minWidth: 100,
  },
  userSelectionOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  userSelectionEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  userSelectionName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  userSelectionNameActive: {
    color: '#fff',
  },
  detailModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
  },
  detailModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  detailScrollView: {
    maxHeight: '80%',
  },
  detailSection: {
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  detailItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
    paddingLeft: 10,
  },
  noHealthData: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  detailCloseButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
  },
  detailCloseText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});