import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';

type GlucoseRecord = {
  id: string;
  value: number;
  timestamp: number;
  date: string;
  mealType: string;
  mealNote: string;
};

type TimeRange = '1week' | '1month' | '3months';

export default function ChartScreen() {
  const [records, setRecords] = useState<GlucoseRecord[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('1week');
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    loadRecords();
    const focusListener = () => loadRecords();
    return () => {};
  }, []);

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
    
    return records.filter(record => record.timestamp >= startDate.getTime());
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
    const mealTypes = ['朝食前', '朝食後', '昼食前', '昼食後', '夕食前', '夕食後'];
    
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>経過分析</Text>
        
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
              <Text style={styles.chartTitle}>血糖値推移（{getTimeRangeText()}）</Text>
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
              記録数: {records.length}件
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 40,
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 4,
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
});