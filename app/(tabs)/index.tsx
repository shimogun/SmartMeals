import { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Dimensions, Modal, TextInput, Alert } from 'react-native';
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
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');

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


 // プロフィール編集を開始
 const startEditProfile = () => {
   const user = users[currentUserIndex];
   setEditName(user.name);
   setEditAge(user.age.toString());
   setShowEditProfile(true);
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
        <View style={styles.profileCard}>
          {/* アバター */}
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>{currentUser.avatar}</Text>
          </View>
          
          {/* ユーザー名 */}
          <Text style={styles.userName}>{currentUser.name}</Text>
          <Text style={styles.userAge}>{currentUser.age}歳</Text>
        </View>

        {/* ユーザー切り替えエリア */}
        {users.length > 1 && (
          <View style={styles.switchContainer}>
            <TouchableOpacity 
              style={styles.switchButton}
              onPress={() => switchUser(-1)}
            >
              <Text style={styles.switchButtonText}>◀</Text>
            </TouchableOpacity>
            
            <View style={styles.swipeHint}>
              <Text style={styles.userCounter}>{currentUserIndex + 1} / {users.length}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.switchButton}
              onPress={() => switchUser(1)}
            >
              <Text style={styles.switchButtonText}>▶</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* アクションボタン */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={startEditProfile}
          >
            <Text style={styles.actionButtonText}>プロフィール編集</Text>
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
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    justifyContent: 'center',
  },
  switchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  switchButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  swipeHint: {
    alignItems: 'center',
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
});