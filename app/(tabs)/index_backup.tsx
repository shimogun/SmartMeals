import { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type User = {
  id: string;
  name: string;
  age: number;
  avatar: string;
  createdAt: number;
};

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserIndex, setCurrentUserIndex] = useState(0);

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
        <View style={styles.profileCard}>
          {/* アバター */}
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>{currentUser.avatar}</Text>
          </View>
          
          {/* ユーザー名 */}
          <Text style={styles.userName}>{currentUser.name}</Text>
          <Text style={styles.userAge}>{currentUser.age}歳</Text>
        </View>

        {/* ユーザーカウンター */}
        {users.length > 1 && (
          <View style={styles.swipeHint}>
            <Text style={styles.userCounter}>{currentUserIndex + 1} / {users.length}</Text>
          </View>
        )}
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
  swipeHint: {
    alignItems: 'center',
    marginTop: 30,
  },
  userCounter: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
  },
});