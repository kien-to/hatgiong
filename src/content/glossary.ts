export interface GlossaryEntry {
  id: string
  term: string
  aliases: string[]
  short: string
  body: string
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    id: 'co-phieu',
    term: 'Cổ phiếu',
    aliases: ['cổ phiếu là gì', 'cổ phần', 'stock', 'share'],
    short: 'Một phần quyền sở hữu nhỏ trong một công ty.',
    body: 'Khi mua 100 cổ phiếu VNM, bạn trở thành một trong hàng trăm nghìn người đồng sở hữu Vinamilk. Nếu công ty làm ăn tốt và lợi nhuận tăng, giá cổ phiếu thường tăng theo thời gian và bạn có thể nhận cổ tức. Ngược lại, nếu công ty gặp khó khăn, giá có thể giảm và bạn có thể lỗ.',
  },
  {
    id: 'pe',
    term: 'P/E (Giá / Lợi nhuận)',
    aliases: ['p/e', 'pe', 'chỉ số pe', 'định giá', 'đắt hay rẻ'],
    short: 'Bạn đang trả bao nhiêu đồng cho mỗi 1 đồng lợi nhuận của công ty.',
    body: 'P/E = Giá cổ phiếu ÷ Lợi nhuận trên mỗi cổ phiếu (EPS). P/E bằng 10 nghĩa là bạn trả 10 đồng cho mỗi 1 đồng lợi nhuận hằng năm. P/E thấp chưa chắc là "rẻ" (có thể công ty đang gặp vấn đề), P/E cao chưa chắc là "đắt" (thị trường kỳ vọng tăng trưởng mạnh). Hãy so sánh P/E giữa các công ty cùng ngành, ví dụ ngân hàng với ngân hàng.',
  },
  {
    id: 'pb',
    term: 'P/B (Giá / Giá trị sổ sách)',
    aliases: ['p/b', 'pb', 'chỉ số p/b', 'giá trị sổ sách', 'book value'],
    short: 'Giá cổ phiếu so với giá trị tài sản ròng trên mỗi cổ phiếu.',
    body: 'P/B = Giá ÷ Giá trị sổ sách mỗi cổ phiếu (tài sản trừ nợ, chia cho số cổ phiếu). P/B bằng 1 nghĩa là bạn trả đúng bằng giá trị tài sản ròng trên sổ sách. P/B hay được dùng để so sánh ngân hàng với nhau, vì tài sản của ngân hàng chủ yếu là tiền và khoản vay. P/B thấp có thể là rẻ — hoặc thị trường lo ngại chất lượng tài sản.',
  },
  {
    id: 'roe',
    term: 'ROE và ROA',
    aliases: ['roe', 'roa', 'lợi nhuận trên vốn', 'tỷ suất sinh lời', 'hiệu quả sinh lời'],
    short: 'Công ty tạo ra bao nhiêu lợi nhuận từ vốn chủ sở hữu (ROE) và từ tổng tài sản (ROA).',
    body: 'ROE 20% nghĩa là cứ 100 đồng vốn của cổ đông, công ty tạo ra 20 đồng lợi nhuận mỗi năm. ROA tính trên toàn bộ tài sản, kể cả phần đi vay. ROE cao mà ROA thấp thường có nghĩa công ty dùng nhiều nợ — điều này bình thường với ngân hàng nhưng đáng chú ý với doanh nghiệp sản xuất. Hãy so ROE với các công ty cùng ngành và xem nó có ổn định qua nhiều năm không.',
  },
  {
    id: 'nim-npl',
    term: 'NIM và nợ xấu (NPL) của ngân hàng',
    aliases: ['nim', 'npl', 'nợ xấu', 'biên lãi ròng', 'biên lãi thuần'],
    short: 'Hai chỉ số quan trọng nhất để hiểu một ngân hàng kiếm tiền và rủi ro thế nào.',
    body: 'NIM (biên lãi ròng) là chênh lệch giữa lãi ngân hàng thu từ cho vay và lãi trả cho người gửi tiền, tính trên tài sản sinh lãi — NIM 3% nghĩa là mỗi 100 đồng cho vay mang lại khoảng 3 đồng lãi ròng mỗi năm. NPL (tỷ lệ nợ xấu) là phần khoản vay khó đòi; ở Việt Nam, dưới 2% thường được xem là tốt, và Mầm khuyên bạn để ý xu hướng tăng hay giảm qua từng quý.',
  },
  {
    id: 'co-tuc',
    term: 'Cổ tức',
    aliases: ['cổ tức', 'dividend', 'tỷ suất cổ tức'],
    short: 'Phần lợi nhuận công ty chia lại cho cổ đông.',
    body: 'Ở Việt Nam cổ tức có thể trả bằng tiền mặt hoặc bằng cổ phiếu. Tỷ suất cổ tức 6% nghĩa là nếu giá cổ phiếu 50.000 ₫, mỗi năm bạn nhận khoảng 3.000 ₫ tiền mặt cho mỗi cổ phiếu. Cổ tức tiền mặt bị khấu trừ thuế thu nhập cá nhân 5%.',
  },
  {
    id: 'da-dang-hoa',
    term: 'Đa dạng hóa',
    aliases: ['đa dạng hóa', 'đa dạng hoá', 'phân bổ', 'diversification', 'không bỏ trứng'],
    short: 'Chia tiền vào nhiều cổ phiếu và ngành khác nhau để giảm rủi ro.',
    body: '"Đừng bỏ tất cả trứng vào một giỏ." Nếu bạn dồn hết tiền vào một cổ phiếu và công ty đó gặp sự cố, danh mục có thể mất 30–50%. Khi chia tiền vào 5–10 cổ phiếu ở các ngành khác nhau (ngân hàng, tiêu dùng, công nghệ, năng lượng…), một cổ phiếu giảm mạnh sẽ ảnh hưởng ít hơn đến tổng tài sản. Lưu ý: mua 5 ngân hàng khác nhau vẫn chưa thật sự đa dạng vì chúng thường biến động cùng chiều.',
  },
  {
    id: 'bien-dong',
    term: 'Biến động (Volatility)',
    aliases: ['biến động', 'volatility', 'dao động', 'rủi ro'],
    short: 'Mức độ giá lên xuống mạnh hay yếu.',
    body: 'Cổ phiếu biến động cao có thể tăng 5% hôm nay và giảm 6% ngày mai. Biến động cao không xấu, nhưng nghĩa là bạn phải chịu được việc tài sản giảm mạnh trong ngắn hạn. Người mới thường đánh giá thấp cảm giác khi thấy danh mục đỏ 20% — đó là lý do nên tập với tiền ảo trước.',
  },
  {
    id: 'drawdown',
    term: 'Mức sụt giảm (Drawdown)',
    aliases: ['drawdown', 'sụt giảm', 'giảm từ đỉnh'],
    short: 'Tài sản giảm bao nhiêu % từ mức cao nhất trước đó.',
    body: 'Nếu danh mục tăng lên 120 triệu rồi giảm về 90 triệu, drawdown là 25%. Điều quan trọng: giảm 50% thì cần tăng 100% mới hòa vốn. Vì vậy hạn chế thua lỗ lớn quan trọng hơn cố gắng lãi thật nhiều.',
  },
  {
    id: 'lai-kep',
    term: 'Lãi kép',
    aliases: ['lãi kép', 'lãi suất kép', 'compound', 'tái đầu tư'],
    short: 'Tiền lãi tiếp tục sinh ra lãi theo thời gian.',
    body: 'Đầu tư 2 triệu mỗi tháng với lợi nhuận 10%/năm: sau 10 năm bạn có khoảng 410 triệu (bỏ vào 240 triệu), sau 20 năm khoảng 1,5 tỷ (bỏ vào 480 triệu). Thời gian là yếu tố mạnh nhất của lãi kép — bắt đầu sớm quan trọng hơn bắt đầu với nhiều tiền.',
  },
  {
    id: 'phi-thue',
    term: 'Phí và thuế giao dịch',
    aliases: ['phí', 'thuế', 'phí giao dịch', 'thuế bán', 'chi phí'],
    short: 'Mỗi lệnh khớp đều tốn phí; khi bán còn chịu thuế 0,1%.',
    body: 'Trong ứng dụng này, phí môi giới là 0,15% giá trị mỗi lệnh khớp, và khi bán bạn chịu thêm thuế thu nhập cá nhân 0,1% trên giá trị bán (dù lãi hay lỗ). Mua rồi bán 10 triệu đồng tốn khoảng 40.000 ₫. Giao dịch liên tục khiến phí "ăn mòn" lợi nhuận rất nhanh.',
  },
  {
    id: 'lenh-thi-truong',
    term: 'Lệnh thị trường (MP)',
    aliases: ['lệnh thị trường', 'lệnh mp', 'market order', 'mua ngay'],
    short: 'Mua/bán ngay lập tức theo giá tốt nhất hiện có.',
    body: 'Lệnh thị trường khớp ngay nhưng bạn không kiểm soát chính xác giá. Với cổ phiếu ít thanh khoản, giá khớp có thể khác nhiều so với giá bạn thấy. Phù hợp khi bạn muốn chắc chắn được khớp lệnh.',
  },
  {
    id: 'lenh-gioi-han',
    term: 'Lệnh giới hạn (LO)',
    aliases: ['lệnh giới hạn', 'lệnh lo', 'limit order', 'đặt giá'],
    short: 'Chỉ mua/bán khi giá đạt mức bạn chọn hoặc tốt hơn.',
    body: 'Đặt lệnh mua LO ở 60.000 ₫ nghĩa là bạn chỉ mua khi giá ≤ 60.000 ₫. Bạn kiểm soát được giá nhưng có thể lệnh không bao giờ khớp. Đây là loại lệnh phổ biến nhất ở Việt Nam. Trong ứng dụng, lệnh LO chưa khớp sẽ nằm trong mục "Lệnh chờ" và tạm giữ tiền của bạn.',
  },
  {
    id: 'tran-san',
    term: 'Giá trần, giá sàn, giá tham chiếu',
    aliases: ['giá trần', 'giá sàn', 'tham chiếu', 'trần', 'sàn', 'biên độ', 'màu tím', 'màu xanh lơ'],
    short: 'Giới hạn giá tối đa và tối thiểu trong một phiên.',
    body: 'Giá tham chiếu là giá đóng cửa phiên trước (màu vàng). Trên sàn HOSE, giá trong ngày chỉ được dao động ±7% so với tham chiếu; HNX là ±10%, UPCOM ±15%. Giá trần (màu tím) là mức cao nhất, giá sàn (màu xanh lơ) là mức thấp nhất. Cổ phiếu "tăng trần" nghĩa là tăng hết biên độ cho phép.',
  },
  {
    id: 'lo',
    term: 'Lô giao dịch',
    aliases: ['lô', 'lô chẵn', 'lô lẻ', '100 cổ phiếu', 'số lượng tối thiểu'],
    short: 'Ở Việt Nam, lệnh thường phải là bội số của 100 cổ phiếu.',
    body: 'Một lô chẵn = 100 cổ phiếu. Muốn mua FPT giá 100.000 ₫ bạn cần tối thiểu khoảng 10 triệu đồng (100 cổ × 100.000 ₫) cộng phí. Cổ phiếu lẻ (dưới 100) thường chỉ xuất hiện khi nhận cổ tức bằng cổ phiếu, và trong ứng dụng bạn được bán hết phần lẻ đó.',
  },
  {
    id: 't2',
    term: 'Thanh toán T+2',
    aliases: ['t+2', 't2', 'thanh toán', 'cổ phiếu về', 'khi nào bán được'],
    short: 'Cổ phiếu mua hôm nay khoảng 2 ngày làm việc sau mới về tài khoản.',
    body: 'Ở Việt Nam, cổ phiếu mua ngày T sẽ về tài khoản vào chiều ngày T+2 (tính theo ngày giao dịch, bỏ qua cuối tuần) và lúc đó bạn mới bán được. Ví dụ mua thứ Năm thì từ 13:00 thứ Hai mới bán được. Điều này nghĩa là bạn không thể "lướt sóng" mua sáng bán chiều như ở Mỹ. Ứng dụng mô phỏng đúng quy tắc này; tiền bán cổ phiếu thì dùng được ngay.',
  },
  {
    id: 'gio-giao-dich',
    term: 'Giờ giao dịch',
    aliases: ['giờ giao dịch', 'phiên', 'ato', 'atc', 'mở cửa', 'đóng cửa', 'nghỉ trưa', 'khi nào khớp', 'lệnh hết hạn', 'hết hiệu lực'],
    short: 'Thị trường chỉ khớp lệnh vào giờ hành chính các ngày trong tuần.',
    body: 'Từ thứ Hai đến thứ Sáu: phiên mở cửa ATO 9:00–9:15, khớp lệnh liên tục 9:15–11:30, nghỉ trưa 11:30–13:00, khớp liên tục 13:00–14:30, phiên đóng cửa ATC 14:30–14:45. Ngoài giờ khớp liên tục, bạn vẫn đặt được lệnh giới hạn (LO) và lệnh sẽ chờ đến phiên tiếp theo. Lệnh LO chỉ có hiệu lực trong ngày: nếu đến 15:00 chưa khớp, lệnh hết hạn và tiền tạm giữ được trả lại.',
  },
  {
    id: 'gdkhq',
    term: 'Ngày giao dịch không hưởng quyền (GDKHQ)',
    aliases: ['gdkhq', 'không hưởng quyền', 'ngày chốt quyền', 'ex-date', 'chia cổ tức', 'nhận cổ tức'],
    short: 'Muốn nhận cổ tức, bạn phải sở hữu cổ phiếu trước ngày GDKHQ.',
    body: 'Nếu bạn mua cổ phiếu vào hoặc sau ngày GDKHQ, bạn không nhận được đợt cổ tức đó. Vào ngày GDKHQ, giá tham chiếu thường được điều chỉnh giảm tương ứng với cổ tức, nên "mua để ăn cổ tức" không tự tạo ra lợi nhuận. Cổ tức tiền mặt được trả vào ngày thanh toán, đã trừ 5% thuế thu nhập cá nhân.',
  },
  {
    id: 'buoc-gia',
    term: 'Bước giá',
    aliases: ['bước giá', 'tick', 'đơn vị giá'],
    short: 'Khoảng cách nhỏ nhất giữa hai mức giá được phép đặt.',
    body: 'Trên HOSE: giá dưới 10.000 ₫ có bước 10 ₫; từ 10.000 đến dưới 50.000 ₫ bước 50 ₫; từ 50.000 ₫ trở lên bước 100 ₫. HNX và UPCOM dùng bước 100 ₫. Ví dụ bạn không thể đặt mua HPG ở giá 28.020 ₫, chỉ có thể 28.000 hoặc 28.050 ₫.',
  },
  {
    id: 'von-hoa',
    term: 'Vốn hóa thị trường',
    aliases: ['vốn hóa', 'vốn hoá', 'market cap', 'quy mô'],
    short: 'Tổng giá trị thị trường của toàn bộ cổ phiếu công ty.',
    body: 'Vốn hóa = Giá cổ phiếu × Số cổ phiếu đang lưu hành. Công ty vốn hóa lớn (như VCB, VIC) thường ổn định hơn; công ty vốn hóa nhỏ có thể tăng trưởng nhanh nhưng rủi ro và biến động cao hơn.',
  },
  {
    id: 'vn-index',
    term: 'VN-Index',
    aliases: ['vn-index', 'vnindex', 'chỉ số', 'vn30', 'thị trường chung'],
    short: 'Chỉ số đo lường xu hướng chung của các cổ phiếu trên sàn HOSE.',
    body: 'VN-Index tăng nghĩa là nhìn chung các cổ phiếu trên HOSE (tính theo vốn hóa) đang tăng giá. VN30 là chỉ số của 30 cổ phiếu lớn nhất và thanh khoản tốt nhất. So sánh danh mục của bạn với VN-Index giúp biết bạn làm tốt hơn hay kém hơn "thị trường".',
  },
  {
    id: 'suc-mua',
    term: 'Sức mua',
    aliases: ['sức mua', 'buying power', 'tiền mặt', 'tiền khả dụng'],
    short: 'Số tiền bạn còn dùng được để đặt lệnh mua mới.',
    body: 'Sức mua = Tiền mặt − Tiền đang tạm giữ cho lệnh mua chờ khớp. Khi bạn đặt lệnh LO mua chưa khớp, ứng dụng tạm giữ đủ tiền (gồm cả phí) để đảm bảo lệnh có thể thực hiện.',
  },
  {
    id: 'gia-von',
    term: 'Giá vốn',
    aliases: ['giá vốn', 'giá trung bình', 'average cost', 'lãi lỗ', 'lãi/lỗ'],
    short: 'Giá trung bình bạn đã trả cho mỗi cổ phiếu, đã gồm phí.',
    body: 'Nếu bạn mua 100 cổ ở 30.000 ₫ và 100 cổ ở 34.000 ₫, giá vốn là khoảng 32.000 ₫ (cộng thêm phí). Lãi/lỗ chưa thực hiện = (Giá hiện tại − Giá vốn) × Số lượng. Chỉ khi bán, lãi/lỗ mới trở thành "đã thực hiện".',
  },
  {
    id: 'thanh-khoan',
    term: 'Thanh khoản',
    aliases: ['thanh khoản', 'khối lượng', 'volume', 'liquidity'],
    short: 'Mức độ dễ dàng mua/bán cổ phiếu mà không làm giá thay đổi nhiều.',
    body: 'Cổ phiếu có khối lượng giao dịch lớn mỗi ngày (như HPG, SSI) dễ mua bán. Cổ phiếu ít thanh khoản có thể khó bán khi bạn cần tiền, đặc biệt lúc thị trường hoảng loạn.',
  },
  {
    id: 'nen',
    term: 'Biểu đồ nến',
    aliases: ['biểu đồ nến', 'nến', 'candlestick', 'nến xanh', 'nến đỏ'],
    short: 'Mỗi cây nến tóm tắt giá mở cửa, cao nhất, thấp nhất và đóng cửa trong một ngày.',
    body: 'Thân nến nối giá mở cửa và đóng cửa: nến xanh nghĩa là đóng cửa cao hơn mở cửa, nến đỏ là ngược lại. Hai "râu" phía trên và dưới cho biết giá cao nhất và thấp nhất trong ngày. Râu dài cho thấy giá đã dao động mạnh trong phiên. Biểu đồ nến giúp bạn thấy được tâm lý mua bán, nhưng không thể dự đoán chắc chắn tương lai.',
  },
  {
    id: 'etf',
    term: 'Quỹ ETF',
    aliases: ['etf', 'quỹ', 'quỹ chỉ số', 'e1vfvn30', 'fuevfvnd'],
    short: 'Một "giỏ" cổ phiếu giao dịch như một cổ phiếu duy nhất.',
    body: 'Quỹ ETF như E1VFVN30 mô phỏng chỉ số VN30 — mua một chứng chỉ quỹ là bạn sở hữu gián tiếp 30 cổ phiếu lớn. Đây là cách đa dạng hóa đơn giản, chi phí thấp, rất phù hợp cho người mới. Ứng dụng sẽ hỗ trợ ETF trong phiên bản sau.',
  },
]

export const GLOSSARY_BY_ID: Record<string, GlossaryEntry> = Object.fromEntries(GLOSSARY.map((g) => [g.id, g]))
