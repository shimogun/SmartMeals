import { useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, PanResponder, Animated } from 'react-native';

export default function HomeScreen() {
  const [glucose, setGlucose] = useState(100);
  
 // 指の動きの「起点」を記録するための変数
 const lastUpdateX = useRef(0);

 const panResponder = useRef(
   PanResponder.create({
     onStartShouldSetPanResponder: () => true,
     onPanResponderGrant: () => {
       // 指が触れた瞬間に、基準点をリセット
       lastUpdateX.current = 0;
     },
     onPanResponderMove: (evt, gestureState) => {
       // ★ ここで「感度」を定義（30ピクセル動くごとに1変化）
       const threshold = 1; 
       
       // 前回数字を変えた場所から、どれくらい動いたか
       const distance = gestureState.dx - lastUpdateX.current;

       if (Math.abs(distance) >= threshold) {
         // 右に動けば+1、左に動けば-1
         const direction = distance > 0 ? 1 : -1;
         
         setGlucose(prev => {
           const next = prev + direction;
           return Math.max(50, Math.min(400, next));
         });

         // ★ 重要：数字を変えたので、今の場所を新しい基準点にする
         lastUpdateX.current = gestureState.dx;
       }
     },
     onPanResponderRelease: () => {
       lastUpdateX.current = 0;
     },
   })
 ).current;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>今日の血糖値を記録</Text>
      
      <View style={styles.inputCard}>
        <Text style={styles.label}>空腹時血糖値</Text>
        <View style={styles.valueContainer}>
          <Text style={styles.valueText}>{glucose}</Text>
          <Text style={styles.unitText}>mg/dL</Text>
        </View>

        <View style={styles.controls}>
          {/* マイナスボタン */}
          <TouchableOpacity style={styles.button} onPress={() => setGlucose(p => p - 1)}>
            <Text style={styles.buttonText}>-</Text>
          </TouchableOpacity>

          {/* ★ここがフリックエリアになります★ */}
          <View 
            style={styles.flickArea} 
            {...panResponder.panHandlers}
          >
             <View style={styles.flickTrack}>
                <Text style={styles.hintText}>◀  スライドで調整  ▶</Text>
             </View>
          </View>

          {/* プラスボタン */}
          <TouchableOpacity style={styles.button} onPress={() => setGlucose(p => p + 1)}>
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginTop: 40 },
  label: { fontSize: 16, color: '#333' },
  inputCard: { backgroundColor: '#f8f9fa', borderRadius: 20, padding: 25, marginTop: 20, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  valueContainer: { flexDirection: 'row', alignItems: 'baseline', marginVertical: 20 },
  valueText: { fontSize: 56, fontWeight: 'bold', color: '#007AFF' },
  unitText: { fontSize: 20, marginLeft: 8, color: '#666' },
  controls: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  button: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  buttonText: { fontSize: 24, fontWeight: 'bold', color: '#007AFF' },
  // フリックエリアのスタイル
  flickArea: { flex: 1, height: 60, marginHorizontal: 10, justifyContent: 'center' },
  flickTrack: { backgroundColor: '#e9ecef', height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  hintText: { color: '#666', fontSize: 12, fontWeight: 'bold' }
});