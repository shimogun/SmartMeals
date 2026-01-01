import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView, ScrollView, Dimensions, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';

type GlucoseRecord = {
  id: string;
  value: number;
  timestamp: number;
  date: string;
  mealType: string;
  mealNote: string;
  userId?: string; // ユーザーIDを追加
};

type TimeRange = '1week' | '1month' | '3months';

type WeeklyRecord = {
  id: string;
  weekStart: string; // 週の開始日 (YYYY-MM-DD)
  weight: number | null;
  exercise: 'high' | 'normal' | 'low' | null;
  condition: 'good' | 'normal' | 'poor' | null;
  hba1c: number | null;
  timestamp: number;
};

export default function ChartScreen() {
  const [records, setRecords] = useState<GlucoseRecord[]>([]);
  const [weeklyRecords, setWeeklyRecords] = useState<WeeklyRecord[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('1week');
  const [showWeeklyForm, setShowWeeklyForm] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    loadRecords();
    loadWeeklyRecords();
    loadUsers();
    const focusListener = () => {
      loadRecords();
      loadWeeklyRecords();
    };
    return () => {};
  }, []);

  // ユーザー選択が変更されたときの処理
  useEffect(() => {
    // ユーザーが選択されている場合、グラフのデータを更新
    if (selectedUserId && records.length > 0) {
      console.log(`ユーザー切り替え: ${selectedUserId}`);
    }
  }, [selectedUserId, records]);

  // ユーザーデータ読み込み
  const loadUsers = async () => {
    try {
      const storedUsers = await AsyncStorage.getItem('users');
      if (storedUsers) {
        const parsedUsers = JSON.parse(storedUsers);
        setUsers(parsedUsers);
        // 初回は最初のユーザーを選択
        if (parsedUsers.length > 0 && !selectedUserId) {
          setSelectedUserId(parsedUsers[0].id);
        }
      } else {
        // デフォルトユーザー作成
        const defaultUser = {
          id: Date.now().toString(),
          name: 'あなた',
          age: 30,
          avatar: '👤',
          createdAt: Date.now()
        };
        setUsers([defaultUser]);
        setSelectedUserId(defaultUser.id);
        await AsyncStorage.setItem('users', JSON.stringify([defaultUser]));
      }
    } catch (error) {
      console.error('ユーザー読み込みエラー:', error);
    }
  };

  const loadRecords = async () => {
    try {
      const stored = await AsyncStorage.getItem('glucose_records');
      if (stored) {
        const parsedRecords = JSON.parse(stored);
        setRecords(parsedRecords.sort((a, b) => a.timestamp - b.timestamp));
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    }
  };

  const loadWeeklyRecords = async () => {
    try {
      const stored = await AsyncStorage.getItem('weekly_records');
      if (stored) {
        const parsedRecords = JSON.parse(stored);
        setWeeklyRecords(parsedRecords.sort((a, b) => a.timestamp - b.timestamp));
      }
    } catch (error) {
      console.error('週間データ読み込みエラー:', error);
    }
  };

  // 時間範囲に基づくデータ取得
  const getFilteredRecords = () => {
    if (records.length === 0) return [];
    
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case '1week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3months':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
    }
    
    let filtered = records.filter(record => record.timestamp >= startDate.getTime());
    
    // 選択されたユーザーのデータのみフィルタ
    if (selectedUserId) {
      filtered = filtered.filter(record => 
        record.userId === selectedUserId || 
        (!record.userId && users.length > 0 && users[0].id === selectedUserId) // 古いデータ（userIdがない）は最初のユーザーとして扱う
      );
    }
    
    console.log(`期間: ${timeRange}, ユーザー: ${selectedUserId}, 全データ: ${records.length}件, フィルター後: ${filtered.length}件`);
    return filtered;
  };

  const getChartData = () => {
    const filteredRecords = getFilteredRecords();
    
    if (filteredRecords.length === 0) {
      return {
        labels: ['データなし'],
        datasets: [{
          data: [100],
          strokeWidth: 2
        }]
      };
    }

    // データ数を調整（表示上限）
    const maxDataPoints = timeRange === '1week' ? 7 : timeRange === '1month' ? 15 : 20;
    const step = Math.max(1, Math.floor(filteredRecords.length / maxDataPoints));
    const displayRecords = filteredRecords.filter((_, index) => index % step === 0);
    
    const labels = displayRecords.map(record => {
      const date = new Date(record.timestamp);
      return timeRange === '1week' 
        ? `${date.getMonth() + 1}/${date.getDate()}`
        : `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const data = displayRecords.map(record => record.value);

    return {
      labels,
      datasets: [{
        data,
        strokeWidth: 3,
        color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
      }]
    };
  };

  const getStatistics = () => {
    const filteredRecords = getFilteredRecords();
    if (filteredRecords.length === 0) return null;

    const values = filteredRecords.map(r => r.value);
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    // トレンド分析（最初の半分と後半の平均を比較）
    const halfPoint = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, halfPoint);
    const secondHalf = values.slice(halfPoint);
    
    let trend = 'stable';
    if (firstHalf.length > 0 && secondHalf.length > 0) {
      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
      const difference = secondAvg - firstAvg;
      
      if (difference > 5) trend = 'rising';
      else if (difference < -5) trend = 'falling';
    }

    return { 
      average: Math.round(average), 
      max, 
      min, 
      trend,
      count: filteredRecords.length
    };
  };

  // 食事タイミング別統計
  const getMealTypeStats = () => {
    const filteredRecords = getFilteredRecords();
    const mealTypes = ['朝', '昼', '夜'];
    
    return mealTypes.map(type => {
      const typeRecords = filteredRecords.filter(r => r.mealType === type);
      if (typeRecords.length === 0) return null;
      
      const avg = typeRecords.reduce((sum, r) => sum + r.value, 0) / typeRecords.length;
      return {
        type,
        average: Math.round(avg),
        count: typeRecords.length
      };
    }).filter(Boolean);
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#ffa726"
    }
  };

  const stats = getStatistics();
  const mealStats = getMealTypeStats();

  const getTrendEmoji = (trend: string) => {
    switch (trend) {
      case 'rising': return '📈';
      case 'falling': return '📉';
      default: return '➡️';
    }
  };

  const getTimeRangeText = () => {
    switch (timeRange) {
      case '1week': return '1週間';
      case '1month': return '1ヶ月';
      case '3months': return '3ヶ月';
    }
  };

  // 週間記録を保存
  const saveWeeklyRecord = async (weeklyRecord: Omit<WeeklyRecord, 'id' | 'timestamp'>) => {
    try {
      const newRecord: WeeklyRecord = {
        ...weeklyRecord,
        id: Date.now().toString(),
        timestamp: Date.now(),
      };

      const newRecords = [...weeklyRecords, newRecord];
      await AsyncStorage.setItem('weekly_records', JSON.stringify(newRecords));
      setWeeklyRecords(newRecords);
      
      Alert.alert('記録完了', '週間記録を保存しました');
    } catch (error) {
      console.error('週間記録保存エラー:', error);
      Alert.alert('エラー', '週間記録の保存に失敗しました');
    }
  };

  // 今週の週開始日を取得
  const getCurrentWeekStart = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayDate = new Date(today);
    mondayDate.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    return mondayDate.toISOString().split('T')[0];
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* ユーザー選択セクション */}
        {users.length > 1 && (
          <View style={styles.userSelectionSection}>
            <Text style={styles.userSectionTitle}>👤 表示対象ユーザー</Text>
            <View style={styles.userSelectionContainer}>
              {users.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={[
                    styles.userSelectionOption,
                    selectedUserId === user.id && styles.userSelectionOptionActive
                  ]}
                  onPress={() => setSelectedUserId(user.id)}
                >
                  <Text style={styles.userSelectionEmoji}>{user.avatar}</Text>
                  <Text style={[
                    styles.userSelectionName,
                    selectedUserId === user.id && styles.userSelectionNameActive
                  ]}>{user.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        
        {/* 期間選択 */}
        <View style={styles.timeRangeContainer}>
          {(['1week', '1month', '3months'] as TimeRange[]).map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeRangeButton,
                timeRange === range && styles.timeRangeButtonActive
              ]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[
                styles.timeRangeText,
                timeRange === range && styles.timeRangeTextActive
              ]}>
                {range === '1week' ? '1週間' : range === '1month' ? '1ヶ月' : '3ヶ月'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {getFilteredRecords().length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>データがありません</Text>
            <Text style={styles.emptySubText}>献立タブで血糖値を記録してください</Text>
          </View>
        ) : (
          <>
            {/* 統計情報 */}
            {stats && (
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>平均値</Text>
                  <Text style={styles.statValue}>{stats.average}</Text>
                  <Text style={styles.statUnit}>mg/dL</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>トレンド</Text>
                  <Text style={styles.trendEmoji}>{getTrendEmoji(stats.trend)}</Text>
                  <Text style={styles.trendText}>
                    {stats.trend === 'rising' ? '上昇傾向' : 
                     stats.trend === 'falling' ? '改善傾向' : '安定'}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>記録数</Text>
                  <Text style={styles.statValue}>{stats.count}</Text>
                  <Text style={styles.statUnit}>回</Text>
                </View>
              </View>
            )}

            {/* グラフ */}
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>血糖値推移（{getTimeRangeText()}）- {getFilteredRecords().length}件</Text>
              <LineChart
                data={getChartData()}
                width={screenWidth - 40}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withDots={true}
                withShadow={false}
                withInnerLines={false}
                withOuterLines={true}
                yAxisSuffix=""
              />
            </View>

            {/* 食事タイミング別統計 */}
            {mealStats.length > 0 && (
              <View style={styles.mealStatsContainer}>
                <Text style={styles.sectionTitle}>食事タイミング別平均</Text>
                {mealStats.map((stat, index) => (
                  <View key={index} style={styles.mealStatItem}>
                    <Text style={styles.mealStatType}>{stat.type}</Text>
                    <View style={styles.mealStatValues}>
                      <Text style={styles.mealStatValue}>{stat.average} mg/dL</Text>
                      <Text style={styles.mealStatCount}>({stat.count}回)</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* 目標範囲の説明 */}
            <View style={styles.referenceContainer}>
              <Text style={styles.referenceTitle}>血糖値の目安</Text>
              <View style={styles.referenceItem}>
                <View style={[styles.colorIndicator, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.referenceText}>正常値: 70-109 mg/dL（空腹時）</Text>
              </View>
              <View style={styles.referenceItem}>
                <View style={[styles.colorIndicator, { backgroundColor: '#FF9800' }]} />
                <Text style={styles.referenceText}>境界型: 110-125 mg/dL</Text>
              </View>
              <View style={styles.referenceItem}>
                <View style={[styles.colorIndicator, { backgroundColor: '#F44336' }]} />
                <Text style={styles.referenceText}>糖尿病型: 126 mg/dL以上</Text>
              </View>
            </View>

            <Text style={styles.recordCount}>
              総記録数: {records.length}件 | {getTimeRangeText()}期間: {getFilteredRecords().length}件
            </Text>

            {/* 週間記録追加ボタン */}
            <TouchableOpacity 
              style={styles.weeklyRecordButton}
              onPress={() => setShowWeeklyForm(true)}
            >
              <Text style={styles.weeklyRecordButtonText}>📊 週間記録を追加</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* 週間記録入力モーダル */}
      <WeeklyRecordModal 
        visible={showWeeklyForm}
        onClose={() => setShowWeeklyForm(false)}
        onSave={saveWeeklyRecord}
      />

      {/* 設定モーダル */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>設定</Text>
            
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>📊 データ管理</Text>
              <Text style={styles.settingsItem}>• データのエクスポート</Text>
              <Text style={styles.settingsItem}>• グラフ表示設定</Text>
              <Text style={styles.settingsItem}>• 記録通知設定</Text>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>ℹ️ アプリ情報</Text>
              <Text style={styles.settingsItem}>バージョン: 1.0.0</Text>
              <Text style={styles.settingsItem}>© 2024 SmartMeals</Text>
            </View>
            
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={styles.modalCloseText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// 週間記録入力モーダル
function WeeklyRecordModal({ 
  visible, 
  onClose, 
  onSave 
}: { 
  visible: boolean; 
  onClose: () => void; 
  onSave: (record: Omit<WeeklyRecord, 'id' | 'timestamp'>) => void; 
}) {
  const [weight, setWeight] = useState('');
  const [exercise, setExercise] = useState<'high' | 'normal' | 'low' | null>('normal');
  const [condition, setCondition] = useState<'good' | 'normal' | 'poor' | null>('normal');
  const [hba1c, setHba1c] = useState('');

  // 今週の週開始日を取得
  const getCurrentWeekStart = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayDate = new Date(today);
    mondayDate.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    return mondayDate.toISOString().split('T')[0];
  };

  const handleSave = () => {
    const weeklyRecord = {
      weekStart: getCurrentWeekStart(),
      weight: weight ? parseFloat(weight) : null,
      exercise,
      condition,
      hba1c: hba1c ? parseFloat(hba1c) : null,
    };

    onSave(weeklyRecord);
    
    // フォームリセット
    setWeight('');
    setExercise('normal');
    setCondition('normal');
    setHba1c('');
    
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.weeklyModalContent}>
          <Text style={styles.weeklyModalTitle}>週間記録を追加</Text>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 体重 */}
            <View style={styles.weeklyInputSection}>
              <Text style={styles.weeklyInputLabel}>体重 (kg)</Text>
              <TextInput
                style={styles.weeklyNumberInput}
                value={weight}
                onChangeText={setWeight}
                placeholder="60.5"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>

            {/* 運動レベル */}
            <View style={styles.weeklyInputSection}>
              <Text style={styles.weeklyInputLabel}>今週の運動量</Text>
              <View style={styles.weeklyButtonGroup}>
                {[
                  { key: 'high', label: '多い', color: '#4CAF50' },
                  { key: 'normal', label: '普通', color: '#FF9800' },
                  { key: 'low', label: '少ない', color: '#F44336' }
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.weeklyButton,
                      exercise === item.key && { backgroundColor: item.color }
                    ]}
                    onPress={() => setExercise(item.key as any)}
                  >
                    <Text style={[
                      styles.weeklyButtonText,
                      exercise === item.key && styles.weeklyButtonTextActive
                    ]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 体調 */}
            <View style={styles.weeklyInputSection}>
              <Text style={styles.weeklyInputLabel}>今週の体調</Text>
              <View style={styles.weeklyButtonGroup}>
                {[
                  { key: 'good', label: '良好', color: '#4CAF50' },
                  { key: 'normal', label: '普通', color: '#FF9800' },
                  { key: 'poor', label: '不調', color: '#F44336' }
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.weeklyButton,
                      condition === item.key && { backgroundColor: item.color }
                    ]}
                    onPress={() => setCondition(item.key as any)}
                  >
                    <Text style={[
                      styles.weeklyButtonText,
                      condition === item.key && styles.weeklyButtonTextActive
                    ]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* HbA1c */}
            <View style={styles.weeklyInputSection}>
              <Text style={styles.weeklyInputLabel}>HbA1c (%) ※任意</Text>
              <TextInput
                style={styles.weeklyNumberInput}
                value={hba1c}
                onChangeText={setHba1c}
                placeholder="6.5"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
          </ScrollView>

          <View style={styles.weeklyModalButtons}>
            <TouchableOpacity 
              style={styles.weeklyCancelButton}
              onPress={onClose}
            >
              <Text style={styles.weeklyCancelText}>キャンセル</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.weeklySaveButton}
              onPress={handleSave}
            >
              <Text style={styles.weeklySaveText}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 4,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  timeRangeButtonActive: {
    backgroundColor: '#007AFF',
  },
  timeRangeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  timeRangeTextActive: {
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 5,
  },
  emptySubText: {
    fontSize: 14,
    color: '#ccc',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statUnit: {
    fontSize: 10,
    color: '#999',
  },
  trendEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  trendText: {
    fontSize: 10,
    color: '#333',
    fontWeight: '600',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  mealStatsContainer: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  mealStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mealStatType: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  mealStatValues: {
    alignItems: 'flex-end',
  },
  mealStatValue: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  mealStatCount: {
    fontSize: 11,
    color: '#999',
  },
  referenceContainer: {
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
  referenceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  referenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  referenceText: {
    fontSize: 14,
    color: '#666',
  },
  weeklyRecordButton: {
    backgroundColor: '#007AFF',
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  weeklyRecordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weeklyModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  weeklyModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  weeklyInputSection: {
    marginBottom: 20,
  },
  weeklyInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  weeklyNumberInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  weeklyButtonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weeklyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 2,
    alignItems: 'center',
  },
  weeklyButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  weeklyButtonTextActive: {
    color: '#fff',
  },
  weeklyModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  weeklyCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    alignItems: 'center',
  },
  weeklyCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  weeklySaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    marginLeft: 10,
    alignItems: 'center',
  },
  weeklySaveText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  settingsSection: {
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  settingsItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
    paddingLeft: 10,
  },
  userSelectionSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  userSelectionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  userSelectionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 25,
    padding: 12,
    margin: 5,
    minWidth: 100,
  },
  userSelectionOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  userSelectionEmoji: {
    fontSize: 18,
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
});