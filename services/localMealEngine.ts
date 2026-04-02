// SmartMeals ローカル献立生成エンジン - API不要のルールベース生成
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserHealthProfile, GeneratedMeal } from '../types';
import { breakfastTemplates } from '../data/breakfastTemplates';
import { lunchTemplates } from '../data/lunchTemplates';
import { dinnerTemplates } from '../data/dinnerTemplates';

export interface MealTemplate {
  id: string;
  name: string;
  baseCalories: number;
  baseCarbs: number;
  baseProtein: number;
  baseFat: number;
  ingredients: string[];
  recipe: string[];
  category: 'breakfast' | 'lunch' | 'dinner';
  diabeticFriendly: boolean;
  lowCarb: boolean;
  highProtein: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  season?: string[];
  gi: number; // GI値目安（低GI: 55以下、中GI: 56-69、高GI: 70以上）
}

class LocalMealEngine {
  private mealTemplates: MealTemplate[] = [];

  constructor() {
    this.initializeMealTemplates();
  }

  private initializeMealTemplates(): void {
    this.mealTemplates = [
      // 朝食メニュー（SmartMealsルール準拠：健康的調理法のみ）
      {
        id: 'breakfast-01',
        name: '鶏むね肉の蒸し焼き',
        baseCalories: 280,
        baseCarbs: 8,
        baseProtein: 28,
        baseFat: 15,
        ingredients: ['鶏むね肉100g', 'ブロッコリー50g', '人参30g', 'ハーブソルト小さじ1/2', 'レモン汁大さじ1', 'オリーブオイル小さじ1'],
        recipe: [
          '【下ごしらえ】鶏むね肉は厚みのある部分に包丁を入れて開き、厚さを均一にする。フォークで数カ所穴を開けて味が染み込みやすくする',
          '【下味】鶏肉の両面にハーブソルトをまんべんなく振り、ラップをして冷蔵庫で15分以上置く（時間があれば30分がベスト）',
          '【野菜の準備】ブロッコリーは小房に分け、茎は皮を厚めに剥いて斜め切りにする。人参は5mm厚さの輪切りまたは乱切りにする',
          '【野菜の下茹で】人参は電子レンジ600Wで1分加熱しておくと火の通りが均一になる',
          '【包み方】アルミホイルを30cm程度に切り、中央にオリーブオイルを薄く塗る。鶏肉を置き、周りに野菜を並べる',
          '【仕上げの味付け】レモン汁を全体に回しかけ、お好みで黒こしょうを振る',
          '【包んで焼く】アルミホイルの端をしっかり折りたたんで密閉する。200度に予熱したオーブンで20分焼く',
          '【蒸らし】焼き上がったら2〜3分そのまま置いて蒸らすと、肉汁が落ち着いてジューシーに仕上がる',
          '【盛り付け】ホイルを開けて器に盛り、残った汁もかけて完成'
        ],
        category: 'breakfast',
        diabeticFriendly: true,
        lowCarb: true,
        highProtein: true,
        difficulty: 'easy',
        gi: 40
      },
      {
        id: 'breakfast-02',
        name: '鮭の塩焼き',
        baseCalories: 290,
        baseCarbs: 5,
        baseProtein: 30,
        baseFat: 16,
        ingredients: ['鮭切り身120g', 'レモン1/4個', 'ほうれん草100g', '塩小さじ1/4', 'こしょう少々', '酒大さじ1'],
        recipe: [
          '【鮭の下処理】鮭は水気をキッチンペーパーでしっかり拭き取る。これで生臭みが減り、皮がパリッと焼ける',
          '【下味】鮭の両面に塩を振り、15〜20分置く。水分が出てくるので、再度キッチンペーパーで拭き取る',
          '【臭み消し】酒を振りかけて5分置くと、さらに臭みが取れてふっくら仕上がる',
          '【ほうれん草の下茹で】たっぷりの湯を沸かし、塩を少々加える。根元から先に10秒、全体を入れて30秒茹でる',
          '【色止め】茹でたほうれん草はすぐに冷水に取り、色止めする。水気をしっかり絞って4cm長さに切る',
          '【グリルの準備】魚焼きグリルを中火で2〜3分予熱する。網に薄く油を塗ると身がくっつきにくい',
          '【焼き方】皮目を上にして置き、中火で5〜6分焼く。裏返して3〜4分焼く（皮をパリッとさせたい場合は皮目を下で仕上げる）',
          '【焼き加減の確認】身の一番厚い部分を押してみて、弾力があれば焼き上がり',
          '【盛り付け】器に鮭を盛り、ほうれん草を添える。レモンを添えて、食べる直前に絞って完成'
        ],
        category: 'breakfast',
        diabeticFriendly: true,
        lowCarb: true,
        highProtein: true,
        difficulty: 'easy',
        gi: 35
      },
      {
        id: 'breakfast-03',
        name: 'アボカド納豆トースト',
        baseCalories: 320,
        baseCarbs: 25,
        baseProtein: 18,
        baseFat: 18,
        ingredients: ['全粒粉パン1枚', '納豆1パック', 'アボカド1/2個', '海苔1/2枚', 'オリーブオイル小さじ1', 'レモン汁少々', '醤油少々'],
        recipe: [
          '【アボカドの選び方】軽く押して少しへこむ程度が食べ頃。硬い場合は常温で1〜2日追熟させる',
          '【アボカドの下処理】アボカドは縦半分に切り、種を取り除く。スプーンで実をくり抜き、ボウルに入れる',
          '【ペースト作り】フォークでアボカドを粗めに潰す（完全に滑らかにせず食感を残す）。レモン汁を加えて変色を防ぐ',
          '【納豆の準備】納豆は付属のタレを半量だけ加え、30回以上よく混ぜる。混ぜるほど旨味が増してふわふわになる',
          '【パンをトースト】全粒粉パンをトースターで2〜3分、表面がカリッとするまで焼く',
          '【組み立て】トーストにアボカドペーストを均一に塗る。その上に納豆をまんべんなくのせる',
          '【トッピング】海苔を手で細かくちぎって散らす。オリーブオイルを回しかけ、お好みで醤油を数滴たらす',
          '【ポイント】すぐに食べないとパンがしんなりするので、作りたてを召し上がれ'
        ],
        category: 'breakfast',
        diabeticFriendly: true,
        lowCarb: false,
        highProtein: true,
        difficulty: 'easy',
        gi: 52
      },
      {
        id: 'breakfast-04',
        name: 'ギリシャヨーグルトパフェ',
        baseCalories: 250,
        baseCarbs: 20,
        baseProtein: 20,
        baseFat: 8,
        ingredients: ['ギリシャヨーグルト150g', 'ミックスベリー80g（ブルーベリー、ラズベリー、いちご）', 'アーモンド20g', 'チアシード小さじ1', 'シナモン少々'],
        recipe: [
          '【チアシードの準備】チアシードは前夜から水大さじ2に浸けておくとプルプルになる（時間がなければそのままでもOK）',
          '【ベリーの下処理】冷凍ベリーの場合は、食べる10分前に冷凍庫から出して半解凍にする。生の場合は軽く洗って水気を切る',
          '【アーモンドの準備】アーモンドは包丁で粗く刻む。フライパンで1〜2分乾煎りすると香ばしさがアップ',
          '【ヨーグルトの準備】ギリシャヨーグルトは冷蔵庫から出したてが濃厚で美味しい',
          '【層を作る】グラスまたは器の底にヨーグルトの1/3量を入れる',
          '【ベリーをのせる】ヨーグルトの上にベリーの半量を散らす',
          '【繰り返す】残りのヨーグルトとベリーを交互に重ねて層を作る',
          '【トッピング】最後にアーモンド、チアシード、シナモンを振りかけて完成',
          '【アレンジ】お好みでミントの葉を添えると見た目も爽やかに'
        ],
        category: 'breakfast',
        diabeticFriendly: true,
        lowCarb: true,
        highProtein: true,
        difficulty: 'easy',
        gi: 45
      },
      {
        id: 'breakfast-05',
        name: '豆腐スクランブルエッグ',
        baseCalories: 260,
        baseCarbs: 10,
        baseProtein: 22,
        baseFat: 14,
        ingredients: ['木綿豆腐150g', '卵1個', 'ねぎ30g', 'ごま油小さじ1', '醤油小さじ1', '塩少々', '白ごま適量'],
        recipe: [
          '【豆腐の水切り】木綿豆腐をキッチンペーパーで包み、電子レンジ600Wで2分加熱。重しをして10分置くとしっかり水が切れる',
          '【豆腐を崩す】水切りした豆腐を手で粗めに崩す。卵のような食感を出すため、細かくしすぎない',
          '【ねぎの準備】ねぎは小口切りにする。白い部分と緑の部分を分けておく（白は炒め用、緑は仕上げ用）',
          '【卵の準備】卵をボウルに割り入れ、塩少々を加えてよく溶きほぐす',
          '【フライパンを熱する】フライパンにごま油を入れ、中火で熱する。油が温まったらねぎの白い部分を入れて香りを出す',
          '【豆腐を炒める】崩した豆腐を加え、木べらで混ぜながら中火で2〜3分炒める。水分を飛ばすとコクが出る',
          '【卵を加える】溶き卵を回し入れ、大きくかき混ぜる。卵が半熟のうちに火を止める（余熱で固まる）',
          '【味付け】醤油を鍋肌から回し入れ、香ばしさを出す',
          '【盛り付け】器に盛り、ねぎの緑の部分と白ごまを散らして完成'
        ],
        category: 'breakfast',
        diabeticFriendly: true,
        lowCarb: true,
        highProtein: true,
        difficulty: 'easy',
        gi: 38
      },

      // 昼食メニュー
      {
        id: 'lunch-01',
        name: 'キノコたっぷりサラダ',
        baseCalories: 220,
        baseCarbs: 15,
        baseProtein: 12,
        baseFat: 14,
        ingredients: ['しめじ50g', 'えのき50g', 'レタス80g', 'トマト1/2個', 'アボカド1/4個', '鶏ささみ50g', '亜麻仁油大さじ1', '塩こしょう適量', '酢大さじ1'],
        recipe: [
          '【ささみの下処理】ささみは筋を取り除く。筋の端をフォークで押さえ、包丁の背でしごくと簡単に取れる',
          '【ささみの茹で方】鍋に湯を沸かし、酒大さじ1と塩少々を加える。沸騰したら火を止め、ささみを入れて蓋をして10分放置（余熱で火を通すとしっとり）',
          '【ささみを裂く】粗熱が取れたら、繊維に沿って手で細く裂く。包丁で切るより柔らかい食感になる',
          '【きのこの下処理】しめじは石づきを切り落とし、小房に分ける。えのきは根元を切り落とし、3等分に切ってほぐす',
          '【きのこを焼く】フライパンを中火で熱し、油を引かずにきのこを入れる。触らずに2分焼き、焦げ目がついたら混ぜる（油なしで旨味凝縮）',
          '【きのこの味付け】塩こしょうを振り、さらに1分炒めたらバットに広げて冷ます',
          '【野菜の準備】レタスは冷水に5分さらしてパリッとさせ、水気を切って一口大にちぎる。トマトは1cm角に切る。アボカドは1cm角に切り、レモン汁を振る',
          '【ドレッシング作り】小さなボウルに亜麻仁油、酢、塩こしょうを入れ、よく混ぜる',
          '【盛り付け】大きなボウルにレタスを敷き、トマト、アボカド、冷ましたきのこ、ささみを彩りよく盛る',
          '【仕上げ】食べる直前にドレッシングをかけ、軽く和えて完成'
        ],
        category: 'lunch',
        diabeticFriendly: true,
        lowCarb: true,
        highProtein: true,
        difficulty: 'easy',
        gi: 30
      },
      {
        id: 'lunch-02',
        name: '豆腐ハンバーグ定食',
        baseCalories: 350,
        baseCarbs: 25,
        baseProtein: 25,
        baseFat: 18,
        ingredients: ['木綿豆腐150g', '鶏ひき肉100g', '玉ねぎ1/4個', 'しめじ50g', '玄米80g', '卵1/2個', 'パン粉大さじ2', '塩こしょう適量', '醤油大さじ1', 'みりん大さじ1/2'],
        recipe: [
          '【豆腐の水切り】木綿豆腐をキッチンペーパーで二重に包み、電子レンジ600Wで2分半加熱。重し（皿など）をして20分以上しっかり水切りする',
          '【玉ねぎの準備】玉ねぎをみじん切りにする。フライパンで中火で3〜4分、しんなりして透き通るまで炒め、バットに広げて冷ます',
          '【タネ作り】ボウルに水切りした豆腐を入れ、手でよく潰す。鶏ひき肉、冷ました玉ねぎ、卵、パン粉、塩こしょうを加える',
          '【こね方】粘りが出るまでしっかり混ぜる（2〜3分）。粘りが出ないと焼いた時に崩れやすい',
          '【成形】手に薄く油を塗り、タネを2等分して小判形に成形。中央を少しくぼませると火が通りやすい',
          '【焼き方（表面）】フライパンに薄く油を引き、中火で熱する。ハンバーグを入れ、3〜4分焼いて焼き目をつける',
          '【焼き方（裏面）】裏返したら蓋をして弱火で5〜6分蒸し焼きにする。中まで火を通す',
          '【焼き加減の確認】竹串を刺して透明な汁が出ればOK。赤い汁なら追加で加熱',
          '【きのこソース作り】しめじは小房に分ける。ハンバーグを取り出したフライパンできのこを炒め、醤油とみりんを加えて煮詰める',
          '【盛り付け】玄米、ハンバーグを器に盛り、きのこソースをかけて完成'
        ],
        category: 'lunch',
        diabeticFriendly: true,
        lowCarb: false,
        highProtein: true,
        difficulty: 'medium',
        gi: 48
      },
      {
        id: 'lunch-03',
        name: 'お魚のカルパッチョ',
        baseCalories: 280,
        baseCarbs: 8,
        baseProtein: 30,
        baseFat: 15,
        ingredients: ['白身魚（タイ、ヒラメなど）100g', 'ルッコラ30g', 'ミニトマト4個', 'オリーブオイル大さじ1.5', 'レモン1/4個', 'ケーパー小さじ1', '塩少々', '黒こしょう適量'],
        recipe: [
          '【刺身の選び方】鮮度の良い刺身用の白身魚を選ぶ。サクで買って自分で切ると薄くきれいに切れる',
          '【魚を冷やす】刺身は冷蔵庫でしっかり冷やしておく。冷たい方が薄く切りやすい',
          '【切り方】包丁を斜めに寝かせ、手前に引くように3〜4mm厚さの薄切りにする（そぎ切り）',
          '【皿の準備】平らな皿を冷蔵庫で冷やしておく。冷たい皿の方が魚が美味しく保てる',
          '【魚を並べる】冷やした皿に刺身を少しずつ重ねながら円形に並べる。中央を空けておく',
          '【下味】並べた魚に塩を軽く振り、5分置いて味をなじませる',
          '【野菜の準備】ルッコラは洗って水気を切り、食べやすい大きさにちぎる。ミニトマトは半分に切る',
          '【ドレッシング】小さなボウルにオリーブオイル、レモン汁、塩少々、黒こしょうを入れてよく混ぜる',
          '【盛り付け】皿の中央にルッコラを盛り、周りにトマトを散らす。ケーパーを全体に散らす',
          '【仕上げ】食べる直前にドレッシングを全体に回しかけて完成。時間を置くと魚が締まりすぎるので注意'
        ],
        category: 'lunch',
        diabeticFriendly: true,
        lowCarb: true,
        highProtein: true,
        difficulty: 'medium',
        gi: 35
      },

      // 夕食メニュー
      {
        id: 'dinner-01',
        name: '白身魚の蒸し焼き',
        baseCalories: 300,
        baseCarbs: 12,
        baseProtein: 35,
        baseFat: 12,
        ingredients: ['白身魚（タラ、スズキなど）120g', 'ブロッコリー80g', '人参50g', 'レモン1/4個', 'ハーブソルト小さじ1/2', '白ワイン大さじ1', 'オリーブオイル小さじ1'],
        recipe: [
          '【魚の下処理】白身魚は水気をキッチンペーパーで拭き取る。両面に塩を軽く振り、10分置いて臭みを抜く',
          '【臭み取り】出てきた水分を拭き取り、白ワインを振りかけて5分置く',
          '【野菜の下準備】ブロッコリーは小房に分け、茎は皮を剥いて斜め切りにする。人参は5mm厚さの輪切りにする',
          '【野菜の下茹で】人参は電子レンジ600Wで1分半加熱。ブロッコリーは1分加熱して、半分火を通しておく',
          '【ホイルの準備】アルミホイルを35cm程度に切り、中央にオリーブオイルを薄く塗る',
          '【具材を乗せる】ホイルの中央に人参を敷き、その上に魚を置く。周りにブロッコリーを並べる',
          '【味付け】ハーブソルトを全体に振り、レモンの薄切りを魚の上に2〜3枚乗せる',
          '【包み方】ホイルの両端を中央で合わせ、2〜3回折りたたむ。左右も折って密閉する（蒸気が逃げないように）',
          '【焼き方】200度に予熱したオーブンで15〜18分焼く。またはフライパンに並べ、水を1cm入れて蓋をし中火で12分蒸し焼き',
          '【蒸らし】焼き上がったら2分そのまま置いて蒸らす',
          '【盛り付け】ホイルごと皿に乗せるか、開けて器に盛り付けて完成'
        ],
        category: 'dinner',
        diabeticFriendly: true,
        lowCarb: true,
        highProtein: true,
        difficulty: 'easy',
        gi: 38
      },
      {
        id: 'dinner-02',
        name: '鶏むね肉のグリル',
        baseCalories: 320,
        baseCarbs: 10,
        baseProtein: 40,
        baseFat: 14,
        ingredients: ['鶏むね肉150g', 'ズッキーニ1/2本', 'パプリカ（赤・黄）各1/4個', 'ローズマリー2枝', 'オリーブオイル大さじ1', 'にんにく1片', '塩小さじ1/2', '黒こしょう適量'],
        recipe: [
          '【鶏肉の下処理】鶏むね肉は厚い部分に包丁を入れて開き、厚さを1.5cm程度に均一にする（観音開き）',
          '【フォークで穴を開ける】両面にフォークで数カ所穴を開け、味が染み込みやすくする',
          '【マリネ液作り】ボウルにオリーブオイル大さじ1/2、塩、黒こしょう、みじん切りにしたにんにく、ローズマリーの葉を入れて混ぜる',
          '【マリネする】鶏肉をマリネ液に漬け、ラップをして冷蔵庫で30分以上置く（できれば1時間）',
          '【野菜の準備】ズッキーニは1cm厚さの輪切り、パプリカは一口大に切る',
          '【野菜の下味】野菜に残りのオリーブオイル、塩少々を振っておく',
          '【グリルパンを熱する】グリルパンを中火で3分以上しっかり予熱する（煙が少し出る程度）',
          '【鶏肉を焼く】マリネ液を軽く拭き取り、皮目を下にして4〜5分焼く。焼き目がついたら裏返し3〜4分焼く',
          '【野菜を焼く】鶏肉の横で野菜も焼く。2〜3分で焼き目がついたら裏返す',
          '【焼き加減の確認】鶏肉の一番厚い部分に竹串を刺し、透明な汁が出ればOK',
          '【休ませる】焼き上がった鶏肉をまな板に取り出し、アルミホイルをかぶせて3分休ませる（肉汁が落ち着く）',
          '【盛り付け】鶏肉を食べやすく切り、野菜と共に盛り付け。ローズマリーを飾って完成'
        ],
        category: 'dinner',
        diabeticFriendly: true,
        lowCarb: true,
        highProtein: true,
        difficulty: 'medium',
        gi: 42
      },
      {
        id: 'dinner-03',
        name: '豆腐ステーキきのこあんかけ',
        baseCalories: 280,
        baseCarbs: 18,
        baseProtein: 22,
        baseFat: 16,
        ingredients: ['木綿豆腐1丁（300g）', 'しいたけ3枚', 'えのき50g', 'ねぎ1/2本', '生姜1片', '醤油大さじ1.5', 'みりん大さじ1/2', '片栗粉大さじ2', 'だし汁150ml', 'ごま油大さじ1'],
        recipe: [
          '【豆腐の水切り】豆腐をキッチンペーパーで包み、バットに乗せて重しをして30分以上水切りする（しっかり水切りすると崩れにくい）',
          '【豆腐をカット】水切りした豆腐を横半分に切り、さらに縦に切って4等分にする（厚さ1.5cm程度）',
          '【きのこの下処理】しいたけは石づきを取り、軸と傘を分けて薄切りにする。えのきは根元を切り落とし、半分の長さに切ってほぐす',
          '【薬味の準備】ねぎは斜め薄切りにする。生姜は皮を剥いて千切りにする',
          '【豆腐に粉をつける】豆腐の表面の水気を拭き、片栗粉を全面に薄くまぶす。余分な粉は払い落とす',
          '【豆腐を焼く】フライパンにごま油を中火で熱し、豆腐を並べる。触らずに3〜4分焼き、焼き目をつける',
          '【裏面を焼く】きれいな焼き目がついたらそっと裏返し、裏面も3分焼く。焼けたら皿に取り出す',
          '【あんを作る】同じフライパンにきのこを入れ、中火で2分炒める。しんなりしたらだし汁、醤油、みりんを加える',
          '【とろみをつける】煮立ったら片栗粉小さじ1を同量の水で溶いて加え、とろみがつくまで混ぜる',
          '【仕上げ】生姜を加えてひと混ぜしたら火を止める',
          '【盛り付け】豆腐を器に盛り、熱々のあんをたっぷりかける。ねぎを散らして完成'
        ],
        category: 'dinner',
        diabeticFriendly: true,
        lowCarb: true,
        highProtein: true,
        difficulty: 'medium',
        gi: 45
      },
      // 追加テンプレートを統合
      ...breakfastTemplates,
      ...lunchTemplates,
      ...dinnerTemplates,
    ];
  }

  async generatePersonalizedMeals(
    userProfile: UserHealthProfile,
    periodDays: number,
    servings: number,
    startDate?: Date,
    favoriteIds?: string[]
  ): Promise<{[key: string]: GeneratedMeal[]}> {

    const weeklyMeals: {[key: string]: GeneratedMeal[]} = {};
    const baseDate = startDate || new Date();

    // ユーザープロフィールを分析
    const nutritionMultipliers = this.calculateNutritionMultipliers(userProfile);
    const filteredMeals = this.filterMealsForUser(this.mealTemplates, userProfile);

    console.log(`🏠 ローカルエンジン: ${periodDays}日分の献立生成開始`);

    const usedIds = new Set<string>();

    for (let i = 0; i < periodDays; i++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(baseDate.getDate() + i);
      const dateKey = currentDate.toISOString().split('T')[0];

      console.log(`📅 ${i + 1}日目 (${dateKey}) の献立生成中...`);

      const dailyMeals: GeneratedMeal[] = [];

      // 朝食
      const breakfast = this.selectMeal(filteredMeals, 'breakfast', usedIds, favoriteIds);
      dailyMeals.push(this.createMealFromTemplate(
        breakfast,
        `${i}-breakfast`,
        nutritionMultipliers,
        servings,
        userProfile,
        '朝食'
      ));

      // 昼食
      const lunch = this.selectMeal(filteredMeals, 'lunch', usedIds, favoriteIds);
      dailyMeals.push(this.createMealFromTemplate(
        lunch,
        `${i}-lunch`,
        nutritionMultipliers,
        servings,
        userProfile,
        '昼食'
      ));

      // 夕食
      const dinner = this.selectMeal(filteredMeals, 'dinner', usedIds, favoriteIds);
      dailyMeals.push(this.createMealFromTemplate(
        dinner,
        `${i}-dinner`,
        nutritionMultipliers,
        servings,
        userProfile,
        '夕食'
      ));

      weeklyMeals[dateKey] = dailyMeals;
    }

    console.log(`✅ ローカルエンジン: ${Object.keys(weeklyMeals).length}日分の献立生成完了`);
    return weeklyMeals;
  }

  private calculateNutritionMultipliers(profile: UserHealthProfile): {
    calorie: number;
    carb: number;
    protein: number;
    fat: number;
  } {
    let calorieMultiplier = 1.0;
    let carbMultiplier = 1.0;
    let proteinMultiplier = 1.0;
    let fatMultiplier = 1.0;

    // 年齢と性別による基礎代謝調整
    if (profile.age && profile.age > 60) {
      calorieMultiplier *= 0.9;
    }
    if (profile.gender === 'male') {
      calorieMultiplier *= 1.1;
      proteinMultiplier *= 1.1;
    }

    // 運動レベルによる調整
    switch (profile.activityLevel) {
      case 'light':
        calorieMultiplier *= 0.9;
        break;
      case 'high':
        calorieMultiplier *= 1.2;
        proteinMultiplier *= 1.15;
        break;
    }

    // 血糖値状態による調整
    if (profile.currentGlucose && profile.currentGlucose > 140) {
      carbMultiplier *= 0.7; // 炭水化物を制限
      proteinMultiplier *= 1.1;
    }

    // HbA1cによる調整
    if (profile.hba1c) {
      const hba1c = profile.hba1c;
      if (hba1c > 7.0) {
        carbMultiplier *= 0.8;
        proteinMultiplier *= 1.1;
      }
    }

    // 食事制限レベルによる調整
    switch (profile.dietRestriction) {
      case 'strict':
        carbMultiplier *= 0.6;
        proteinMultiplier *= 1.2;
        fatMultiplier *= 0.9;
        break;
      case 'relaxed':
        carbMultiplier *= 1.1;
        break;
    }

    // 体調による調整
    switch (profile.bodyCondition) {
      case 'poor':
        calorieMultiplier *= 0.95;
        carbMultiplier *= 0.8;
        break;
      case 'good':
        calorieMultiplier *= 1.05;
        break;
    }

    return {
      calorie: calorieMultiplier,
      carb: carbMultiplier,
      protein: proteinMultiplier,
      fat: fatMultiplier
    };
  }

  private filterMealsForUser(templates: MealTemplate[], profile: UserHealthProfile): MealTemplate[] {
    let filtered = templates;

    // 糖尿病に適したメニューを優先
    filtered = filtered.filter(meal => meal.diabeticFriendly);

    // 食事制限レベルに応じたフィルタリング
    if (profile.dietRestriction === 'strict') {
      filtered = filtered.filter(meal => meal.lowCarb);
    }

    // 苦手な食材を除外
    if (profile.dislikedFoods && profile.dislikedFoods.length > 0) {
      filtered = filtered.filter(template => {
        const ingredientsText = template.ingredients.join(' ').toLowerCase();
        return !profile.dislikedFoods!.some(food =>
          ingredientsText.includes(food.toLowerCase())
        );
      });
    }

    // 低GI優先フィルタリング
    if (profile.preferLowGi) {
      const lowGi = filtered.filter(meal => meal.gi <= 55);
      if (lowGi.length >= 3) {
        filtered = lowGi;
      } else {
        const medGi = filtered.filter(meal => meal.gi <= 69);
        if (medGi.length > 0) {
          filtered = medGi;
        }
      }
    }

    // 糖質上限フィルタリング（1食あたり = 1日上限の1/3）
    if (profile.dailyCarbLimit) {
      const perMealLimit = profile.dailyCarbLimit / 3;
      const carbFiltered = filtered.filter(meal => meal.baseCarbs <= perMealLimit);
      if (carbFiltered.length >= 3) {
        filtered = carbFiltered;
      }
    }

    // カロリー上限フィルタリング（1食あたり = 1日上限の1/3）
    if (profile.dailyCalorieLimit) {
      const perMealLimit = profile.dailyCalorieLimit / 3;
      const calFiltered = filtered.filter(meal => meal.baseCalories <= perMealLimit);
      if (calFiltered.length >= 3) {
        filtered = calFiltered;
      }
    }

    // フィルタ後にテンプレートが0件にならないよう最低1件は確保
    if (filtered.length === 0) {
      filtered = templates.slice(0, 1);
    }

    return filtered;
  }

  private selectMeal(
    templates: MealTemplate[],
    category: string,
    usedIds: Set<string>,
    favoriteIds?: string[]
  ): MealTemplate {
    const categoryTemplates = templates.filter(t => t.category === category);
    if (categoryTemplates.length === 0) {
      return templates[0];
    }

    // お気に入りかつ未使用のテンプレートを優先
    if (favoriteIds && favoriteIds.length > 0) {
      const favUnused = categoryTemplates.filter(
        t => favoriteIds.includes(t.id) && !usedIds.has(t.id)
      );
      if (favUnused.length > 0) {
        const selected = favUnused[Math.floor(Math.random() * favUnused.length)];
        usedIds.add(selected.id);
        return selected;
      }
    }

    // 未使用のテンプレートから選択
    const unused = categoryTemplates.filter(t => !usedIds.has(t.id));
    const pool = unused.length > 0 ? unused : categoryTemplates;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    usedIds.add(selected.id);
    return selected;
  }

  private createMealFromTemplate(
    template: MealTemplate,
    id: string,
    multipliers: { calorie: number; carb: number; protein: number; fat: number },
    servings: number,
    profile: UserHealthProfile,
    mealTypeJapanese: string
  ): GeneratedMeal {
    
    // 栄養価を調整
    const adjustedCalories = Math.round(template.baseCalories * multipliers.calorie);
    const adjustedCarbs = Math.round(template.baseCarbs * multipliers.carb);
    const adjustedProtein = Math.round(template.baseProtein * multipliers.protein);
    const adjustedFat = Math.round(template.baseFat * multipliers.fat);

    // パーソナライズされた説明を生成
    const personalizedDescription = this.generatePersonalizedDescription(
      template, 
      profile, 
      mealTypeJapanese
    );

    return {
      id,
      name: template.name,
      calories: adjustedCalories,
      carbs: adjustedCarbs,
      protein: adjustedProtein,
      fat: adjustedFat,
      description: personalizedDescription,
      ingredients: [...template.ingredients],
      recipe: [...template.recipe],
      servings
    };
  }

  private generatePersonalizedDescription(
    template: MealTemplate,
    profile: UserHealthProfile,
    mealType: string
  ): string {
    let description = `${mealType}に最適化された血糖値管理メニュー。`;

    // 食材選択に基づく説明を追加（複数選択対応）
    if (profile.selectedMainCourses && profile.selectedMainCourses.length > 0) {
      if (profile.selectedMainCourses.some(course => course.includes('玄米') || course.includes('雑穀'))) {
        description += "選択された低GI主食で血糖値上昇を緩やかにします。";
      } else if (profile.selectedMainCourses.some(course => course.includes('なし'))) {
        description += "主食なしの糖質制限スタイルでケトジェニック効果を重視します。";
      } else if (profile.selectedMainCourses.some(course => course.includes('オートミール'))) {
        description += "水溶性食物繊維豊富なオートミールで満腹感と血糖値安定を両立。";
      }
    }

    if (profile.selectedMainIngredients && profile.selectedMainIngredients.length > 0) {
      if (profile.selectedMainIngredients.some(ingredient => ingredient.includes('鶏むね肉') || ingredient.includes('ささみ'))) {
        description += "高タンパク・低脂肪の鶏肉で筋肉維持をサポート。";
      } else if (profile.selectedMainIngredients.some(ingredient => ingredient.includes('鮭') || ingredient.includes('サバ'))) {
        description += "オメガ3脂肪酸豊富な魚で心血管の健康もケア。";
      } else if (profile.selectedMainIngredients.some(ingredient => ingredient.includes('豆腐'))) {
        description += "植物性タンパク質で消化に優しく血糖値に影響を与えません。";
      }
    }

    if (profile.selectedSideIngredients && profile.selectedSideIngredients.length > 0) {
      if (profile.selectedSideIngredients.some(ingredient => ingredient.includes('ブロッコリー') || ingredient.includes('ほうれん草'))) {
        description += "緑黄色野菜で抗酸化作用とミネラル補給。";
      } else if (profile.selectedSideIngredients.some(ingredient => ingredient.includes('きのこ'))) {
        description += "きのこ類の食物繊維で血糖値上昇抑制効果を期待。";
      } else if (profile.selectedSideIngredients.some(ingredient => ingredient.includes('わかめ') || ingredient.includes('ひじき'))) {
        description += "海藻のミネラルと水溶性食物繊維で代謝をサポート。";
      }
    }

    // 個人の状況に応じた説明を追加
    if (profile.currentGlucose && profile.currentGlucose > 140) {
      description += "現在の血糖値が高めのため、低GI食材中心の構成です。";
    }

    if (profile.dietRestriction === 'strict') {
      description += "厳格な糖質制限に対応した低炭水化物メニューです。";
    }

    if (template.highProtein) {
      description += "高タンパク質で筋肉維持と血糖値安定をサポートします。";
    }

    if (profile.bodyCondition === 'poor') {
      description += "体調不良時でも消化しやすく調理しています。";
    }

    return description;
  }

  // テスト用のダミー生成
  async generateSampleMeals(periodDays: number, servings: number, startDate?: Date): Promise<{[key: string]: GeneratedMeal[]}> {
    return this.generatePersonalizedMeals(
      {
        age: 45,
        gender: 'male',
        height: 170,
        weight: 70,
        activityLevel: 'moderate',
        currentGlucose: 120,
        hba1c: 6.8,
        bodyCondition: 'normal',
        dietRestriction: 'normal',
        selectedMainCourses: [],
        selectedMainIngredients: [],
        selectedSideIngredients: [],
      },
      periodDays,
      servings,
      startDate
    );
  }
}

export default new LocalMealEngine();