import { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, PanResponder, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type User = {
  id: string;
  name: string;
  age: number;
  avatar: string;
  createdAt: number;
};

type GlucoseRecord = {
  id: string;
  value: number;
  timestamp: number;
  date: string;
  mealType: string;
  mealNote: string;
};

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [records, setRecords] = useState<GlucoseRecord[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);

  // スワイプ用の参照
  const lastSwipeX = useRef(0);

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

     // 血糖値データ読み込み
     const stored = await AsyncStorage.getItem('glucose_records');
     if (stored) {
       setRecords(JSON.parse(stored));
     }
   } catch (error) {
     console.error('データ読み込みエラー:', error);
   }
 };

 // 今日の最新血糖値を取得
 const getTodayLatestGlucose = () => {
   const today = new Date().toISOString().split('T')[0];
   const todayRecords = records.filter(record => record.date === today);
   return todayRecords.length > 0 ? todayRecords[todayRecords.length - 1] : null;
 };

 // ユーザー切り替え
 const switchUser = (direction: number) => {
   if (users.length <= 1) return; // 1人以下の場合は切り替えしない
   
   setCurrentUserIndex(prev => {
     const newIndex = prev + direction;
     if (newIndex < 0) return users.length - 1;
     if (newIndex >= users.length) return 0;
     return newIndex;
   });
 };

 // スワイプジェスチャーでユーザー切り替え
 const panResponder = useRef(
   PanResponder.create({
     onStartShouldSetPanResponder: () => true,
     onPanResponderGrant: () => {
       lastSwipeX.current = 0;
     },
     onPanResponderMove: (evt, gestureState) => {
       const threshold = 100; // スワイプの閾値
       const distance = gestureState.dx - lastSwipeX.current;

       if (Math.abs(distance) >= threshold) {
         const direction = distance > 0 ? -1 : 1; // 右スワイプで前のユーザー
         switchUser(direction);
         lastSwipeX.current = gestureState.dx;
       }
     },
     onPanResponderRelease: () => {
       lastSwipeX.current = 0;
     },
   })
 ).current;

  const currentUser = users.length > 0 ? users[currentUserIndex] : null;
  const todayGlucose = getTodayLatestGlucose();

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ color: '#fff', textAlign: 'center', marginTop: 100 }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* スワイプエリア */}
      <View style={styles.swipeContainer} {...panResponder.panHandlers}>
        
        {/* メインプロフィールカード */}
        <View style={styles.profileCard}>
          
          {/* アバター */}
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>{currentUser.avatar}</Text>
          </View>
          
          {/* ユーザー名 */}
          <Text style={styles.userName}>{currentUser.name}</Text>
          <Text style={styles.userAge}>{currentUser.age}歳</Text>
          
          {/* 今日の血糖値 */}
          <View style={styles.todaySection}>
            <Text style={styles.todayLabel}>今日の最新</Text>
            {todayGlucose ? (
              <>
                <Text style={styles.todayValue}>{todayGlucose.value}</Text>
                <Text style={styles.todayUnit}>mg/dL</Text>
                <Text style={styles.todayTime}>
                  {new Date(todayGlucose.timestamp).toLocaleTimeString('ja-JP', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </>
            ) : (
              <Text style={styles.noDataText}>記録なし</Text>
            )}
          </View>
        </View>

        {/* ユーザー切り替えヒント */}
        {users.length > 1 && (
          <View style={styles.swipeHint}>
            <Text style={styles.swipeHintText}>◀ スワイプでユーザー切り替え ▶</Text>
            <Text style={styles.userCounter}>{currentUserIndex + 1} / {users.length}</Text>
          </View>
        )}

        {/* アクションボタン */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => console.log('プロフィール編集')}
          >
            <Text style={styles.actionButtonText}>プロフィール編集</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.addButton]}
            onPress={() => console.log('家族追加')}
          >
            <Text style={styles.addButtonText}>+ 家族を追加</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  todaySection: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    padding: 25,
    width: '100%',
  },
  todayLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  todayValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  todayUnit: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  todayTime: {
    fontSize: 14,
    color: '#999',
  },
  noDataText: {
    fontSize: 18,
    color: '#ccc',
    fontStyle: 'italic',
  },
  swipeHint: {
    alignItems: 'center',
    marginTop: 30,
  },
  swipeHintText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  userCounter: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
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
});