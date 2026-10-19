export type Skill = 'basics' | 'orders' | 'risk' | 'costs'

export const SKILL_LABEL: Record<Skill, string> = {
  basics: 'Kiến thức nền tảng',
  orders: 'Đặt lệnh',
  risk: 'Hiểu rủi ro',
  costs: 'Chi phí & lãi kép',
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  answer: number
  explain: string
}

export interface Lesson {
  id: string
  title: string
  summary: string
  icon: string
  askPrompt: string
  minutes: number
  skill: Skill
  sections: { heading: string; body: string }[]
  quiz: QuizQuestion[]
  widget?: 'compound'
}

export const LESSONS: Lesson[] = [
  {
    id: 'stocks-101',
    title: 'Cổ phiếu là gì?',
    summary: 'Hiểu bạn thực sự sở hữu gì khi mua một cổ phiếu.',
    icon: '🌱',
    askPrompt: 'Cổ phiếu là gì?',
    minutes: 3,
    skill: 'basics',
    sections: [
      { heading: 'Bạn mua một phần công ty', body: 'Cổ phiếu là một phần quyền sở hữu công ty. Mua cổ phiếu FPT nghĩa là bạn cùng sở hữu FPT với hàng trăm nghìn nhà đầu tư khác, dù chỉ là phần rất nhỏ.' },
      { heading: 'Bạn kiếm tiền như thế nào?', body: 'Có hai cách: (1) giá cổ phiếu tăng và bạn bán cao hơn giá mua; (2) công ty chia cổ tức. Về dài hạn, giá cổ phiếu thường đi theo lợi nhuận của công ty.' },
      { heading: 'Rủi ro là có thật', body: 'Giá cổ phiếu có thể giảm, thậm chí giảm rất mạnh. Không có ai, kể cả chuyên gia hay AI, có thể dự đoán chắc chắn giá ngày mai. Đó là lý do bạn tập ở đây với tiền ảo trước.' },
    ],
    quiz: [
      { id: 'q1', question: 'Khi mua 100 cổ phiếu VNM, bạn sở hữu gì?', options: ['Một khoản cho Vinamilk vay', 'Một phần nhỏ công ty Vinamilk', 'Quyền mua sữa giá rẻ', 'Một hợp đồng bảo hiểm'], answer: 1, explain: 'Cổ phiếu là quyền sở hữu, không phải khoản vay. Khoản cho vay công ty gọi là trái phiếu.' },
      { id: 'q2', question: 'Hai nguồn lợi nhuận chính từ cổ phiếu là gì?', options: ['Lãi suất và phí', 'Tăng giá và cổ tức', 'Thưởng Tết và cổ tức', 'Chỉ có tăng giá'], answer: 1, explain: 'Bạn có thể lãi khi giá tăng (chênh lệch giá) và khi công ty chia cổ tức.' },
      { id: 'q3', question: 'Câu nào đúng?', options: ['Cổ phiếu lớn không bao giờ giảm', 'Chuyên gia luôn biết giá ngày mai', 'Giá cổ phiếu có thể giảm và bạn có thể lỗ', 'Mua cổ phiếu đảm bảo lãi 10%/năm'], answer: 2, explain: 'Mọi cổ phiếu đều có rủi ro mất giá. Hãy cẩn trọng với bất kỳ ai "cam kết lợi nhuận".' },
    ],
  },
  {
    id: 'price-board',
    title: 'Đọc bảng giá Việt Nam',
    summary: 'Giá tham chiếu, trần, sàn, màu sắc và lô 100.',
    icon: '🎨',
    askPrompt: 'Giá trần, giá sàn là gì?',
    minutes: 4,
    skill: 'basics',
    sections: [
      { heading: 'Ba mức giá quan trọng', body: 'Giá tham chiếu (vàng) là giá đóng cửa hôm qua. Giá trần (tím) và giá sàn (xanh lơ) là giới hạn trên và dưới trong ngày. Trên HOSE biên độ là ±7%, HNX ±10%, UPCOM ±15%.' },
      { heading: 'Màu sắc', body: 'Xanh lá: tăng so với tham chiếu. Đỏ: giảm. Vàng: đứng giá. Tím: tăng trần. Xanh lơ: giảm sàn. Ứng dụng này dùng đúng quy ước màu của bảng giá Việt Nam.' },
      { heading: 'Lô 100 cổ phiếu', body: 'Lệnh mua phải là bội số của 100 cổ phiếu. Vì vậy với giá 62.000 ₫, lệnh nhỏ nhất bạn có thể mua VCB là 100 cổ ≈ 6,2 triệu đồng.' },
    ],
    quiz: [
      { id: 'q1', question: 'Giá tham chiếu VCB là 60.000 ₫ (HOSE). Giá trần hôm nay khoảng bao nhiêu?', options: ['61.200 ₫', '64.200 ₫', '66.000 ₫', '70.000 ₫'], answer: 1, explain: '60.000 × 1,07 = 64.200 ₫. HOSE có biên độ ±7%.' },
      { id: 'q2', question: 'Trên bảng giá, cổ phiếu hiện màu tím nghĩa là gì?', options: ['Giảm sàn', 'Đứng giá tham chiếu', 'Tăng trần', 'Bị đình chỉ giao dịch'], answer: 2, explain: 'Màu tím = giá trần, mức cao nhất được phép trong phiên.' },
      { id: 'q3', question: 'Lệnh mua nào hợp lệ trên HOSE?', options: ['50 cổ phiếu', '150 cổ phiếu', '300 cổ phiếu', '1.250 cổ phiếu'], answer: 2, explain: 'Lệnh mua phải là bội số của 100.' },
    ],
  },
  {
    id: 'orders',
    title: 'Lệnh thị trường và lệnh giới hạn',
    summary: 'Chọn đúng loại lệnh cho mục tiêu của bạn.',
    icon: '🧾',
    askPrompt: 'Lệnh giới hạn là gì?',
    minutes: 4,
    skill: 'orders',
    sections: [
      { heading: 'Lệnh thị trường (MP)', body: 'Khớp ngay với giá tốt nhất hiện có. Bạn chắc chắn được mua/bán, nhưng không chắc chắn về giá.' },
      { heading: 'Lệnh giới hạn (LO)', body: 'Bạn chọn giá tối đa muốn mua (hoặc tối thiểu muốn bán). Bạn kiểm soát giá, nhưng lệnh có thể không khớp. Giá đặt phải nằm trong khoảng trần–sàn và đúng bước giá.' },
      { heading: 'Mẹo cho người mới', body: 'Đừng "đuổi giá". Hãy quyết định mức giá hợp lý trước, đặt lệnh LO, và chấp nhận nếu không khớp. Kỷ luật quan trọng hơn mua được thật nhanh.' },
    ],
    quiz: [
      { id: 'q1', question: 'Bạn muốn mua HPG nhưng chỉ khi giá ≤ 27.500 ₫. Dùng lệnh gì?', options: ['Lệnh thị trường', 'Lệnh giới hạn mua giá 27.500 ₫', 'Lệnh giới hạn bán giá 27.500 ₫', 'Không đặt được'], answer: 1, explain: 'Lệnh LO mua ở 27.500 ₫ chỉ khớp khi giá bằng hoặc thấp hơn mức đó.' },
      { id: 'q2', question: 'Nhược điểm chính của lệnh giới hạn là gì?', options: ['Phí cao gấp đôi', 'Có thể không được khớp', 'Luôn khớp giá xấu', 'Chỉ dùng được khi bán'], answer: 1, explain: 'Nếu giá không chạm mức bạn đặt, lệnh sẽ nằm chờ và có thể không khớp.' },
      { id: 'q3', question: 'Giá HPG 28.000 ₫, tham chiếu 28.000 ₫. Lệnh LO mua giá nào bị từ chối?', options: ['27.000 ₫', '28.500 ₫', '30.500 ₫', '29.950 ₫'], answer: 2, explain: 'Giá trần là 28.000 × 1,07 ≈ 29.950 ₫. 30.500 ₫ vượt trần nên không hợp lệ.' },
    ],
  },
  {
    id: 'diversification',
    title: 'Đa dạng hóa danh mục',
    summary: 'Vì sao không nên bỏ hết trứng vào một giỏ.',
    icon: '🧺',
    askPrompt: 'Đa dạng hóa là gì?',
    minutes: 4,
    skill: 'risk',
    sections: [
      { heading: 'Một cổ phiếu, một rủi ro lớn', body: 'Nếu 100% tiền nằm trong một cổ phiếu, một tin xấu về công ty đó có thể làm bạn mất rất nhiều. Đa dạng hóa giúp một sự cố riêng lẻ không phá hỏng cả danh mục.' },
      { heading: 'Đa dạng theo ngành', body: 'Ngân hàng thường tăng giảm cùng nhau. Danh mục 5 ngân hàng vẫn tập trung rủi ro. Hãy kết hợp các ngành: ngân hàng, tiêu dùng, công nghệ, năng lượng, vật liệu…' },
      { heading: 'Quy tắc đơn giản', body: 'Một gợi ý phổ biến cho người mới: không để một cổ phiếu chiếm quá 20–25% danh mục, và không để một ngành chiếm quá 40%. Trợ lý AI sẽ nhắc bạn nếu danh mục quá tập trung.' },
    ],
    quiz: [
      { id: 'q1', question: 'Danh mục nào đa dạng hơn?', options: ['VCB, BID, CTG, TCB', 'VCB, FPT, VNM, GAS', '100% VIC', 'HPG và HSG (cùng ngành thép)'], answer: 1, explain: 'VCB, FPT, VNM, GAS thuộc 4 ngành khác nhau: ngân hàng, công nghệ, tiêu dùng, năng lượng.' },
      { id: 'q2', question: 'Mục tiêu chính của đa dạng hóa là gì?', options: ['Đảm bảo luôn có lãi', 'Giảm tác động của một khoản đầu tư xấu', 'Giảm phí giao dịch', 'Mua được nhiều cổ phiếu hơn'], answer: 1, explain: 'Đa dạng hóa không loại bỏ rủi ro, nhưng giảm thiệt hại khi một khoản đầu tư gặp sự cố.' },
      { id: 'q3', question: 'Một cổ phiếu chiếm 70% danh mục. Đó là…', options: ['Rất đa dạng', 'Tập trung rủi ro cao', 'Không ảnh hưởng gì', 'Bắt buộc với người mới'], answer: 1, explain: 'Khi một cổ phiếu chiếm 70%, kết quả của bạn gần như phụ thuộc hoàn toàn vào nó.' },
    ],
  },
  {
    id: 'volatility',
    title: 'Biến động và sụt giảm',
    summary: 'Chuẩn bị tâm lý cho những ngày thị trường đỏ.',
    icon: '🎢',
    askPrompt: 'Drawdown là gì?',
    minutes: 5,
    skill: 'risk',
    sections: [
      { heading: 'Giá lên xuống là bình thường', body: 'Ngay cả cổ phiếu tốt nhất cũng có những năm giảm 20–30%. VN-Index từng giảm hơn 30% trong năm 2022 trước khi hồi phục.' },
      { heading: 'Toán học của thua lỗ', body: 'Giảm 10% cần tăng 11% để hòa vốn. Giảm 50% cần tăng 100%. Vì vậy tránh thua lỗ lớn quan trọng hơn cố tìm cổ phiếu tăng gấp đôi.' },
      { heading: 'Phản ứng của bạn quan trọng nhất', body: 'Sai lầm phổ biến nhất của người mới là hoảng loạn bán đáy và mua đuổi khi giá đã tăng mạnh. Hãy dùng tiền ảo để quan sát cảm xúc của chính bạn khi danh mục đỏ.' },
    ],
    quiz: [
      { id: 'q1', question: 'Danh mục giảm 50%. Cần tăng bao nhiêu % để hòa vốn?', options: ['50%', '75%', '100%', '150%'], answer: 2, explain: '100 → 50 cần tăng thêm 50, tức là 100% của 50.' },
      { id: 'q2', question: 'Danh mục tăng từ 100 lên 120 triệu rồi giảm về 96 triệu. Drawdown là?', options: ['4%', '20%', '24%', '16%'], answer: 1, explain: 'Drawdown tính từ đỉnh: (120 − 96) ÷ 120 = 20%.' },
      { id: 'q3', question: 'Cổ phiếu tốt vừa giảm 15% vì thị trường chung giảm. Hành động thiếu cân nhắc nhất là?', options: ['Xem lại lý do bạn mua', 'Bán ngay vì hoảng sợ mà không xem lại', 'Kiểm tra tin tức công ty', 'Đánh giá lại tỷ trọng danh mục'], answer: 1, explain: 'Quyết định do cảm xúc thường dẫn đến bán đáy. Hãy luôn quay lại lý do đầu tư ban đầu.' },
    ],
  },
  {
    id: 'costs-compound',
    title: 'Phí, thuế và lãi kép',
    summary: 'Chi phí nhỏ, thời gian dài — hai lực ngược chiều.',
    icon: '⏳',
    askPrompt: 'Lãi kép là gì?',
    minutes: 5,
    skill: 'costs',
    widget: 'compound',
    sections: [
      { heading: 'Mỗi lệnh đều tốn tiền', body: 'Phí môi giới 0,15% mỗi lần khớp và thuế 0,1% khi bán. Một vòng mua-bán tốn khoảng 0,4%. Giao dịch 50 vòng mỗi năm có thể mất 20% vốn chỉ vì phí!' },
      { heading: 'Lãi kép là bạn đồng hành', body: 'Khi lợi nhuận được tái đầu tư, nó tiếp tục sinh lời. Thời gian càng dài, hiệu ứng càng mạnh. Thử máy tính bên dưới để thấy sự khác biệt giữa 10 năm và 30 năm.' },
    ],
    quiz: [
      { id: 'q1', question: 'Bạn bán cổ phiếu trị giá 20 triệu và bị lỗ. Có phải chịu thuế bán không?', options: ['Không, vì lỗ', 'Có, 0,1% giá trị bán = 20.000 ₫', 'Có, 20% số tiền lỗ', 'Chỉ khi lãi trên 10%'], answer: 1, explain: 'Ở Việt Nam, thuế 0,1% tính trên giá trị bán, bất kể lãi hay lỗ.' },
      { id: 'q2', question: 'Yếu tố mạnh nhất của lãi kép là gì?', options: ['Số tiền ban đầu thật lớn', 'Thời gian đầu tư', 'Giao dịch thường xuyên', 'Chọn được cổ phiếu tăng trần'], answer: 1, explain: 'Thời gian là yếu tố cộng hưởng mạnh nhất. Bắt đầu sớm với ít tiền thường tốt hơn bắt đầu muộn với nhiều tiền.' },
      { id: 'q3', question: 'Vì sao giao dịch quá nhiều thường làm giảm lợi nhuận?', options: ['Vì sàn phạt người giao dịch nhiều', 'Vì phí và thuế cộng dồn mỗi lần', 'Vì cổ phiếu sẽ bị khóa', 'Không ảnh hưởng gì'], answer: 1, explain: 'Mỗi vòng mua-bán tốn khoảng 0,4%. Nhiều vòng thì chi phí tích lũy rất lớn.' },
    ],
  },
]

export const LESSON_BY_ID: Record<string, Lesson> = Object.fromEntries(LESSONS.map((l) => [l.id, l]))
