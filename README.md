# Adcash: Xem & Kiếm Thưởng

Một source code dùng chung cho:

- Web (Vite + React)
- Android APK (Capacitor)
- Android AAB (Capacitor)

## Trạng thái hiện tại

App đã bỏ hoàn toàn quảng cáo giả 6 giây và localStorage balance.

Luồng hiện tại:

1. App tạo/khôi phục Supabase anonymous user.
2. Monlix nhận `userid` là UUID Supabase của user.
3. Monlix gửi S2S postback về Supabase Edge Function sau conversion hợp lệ.
4. Edge Function xác minh `secretKey`, gọi RPC server-side.
5. `transaction_id` là UNIQUE nên callback lặp không được cộng tiền hai lần.
6. `status=2` được xử lý như chargeback và trừ lại reward đã ghi.
7. Client chỉ đọc ví/lịch sử của chính user qua RLS.
8. Rút tiền gọi RPC server-side, kiểm tra số dư và trừ ví atomically trước khi tạo yêu cầu pending.

Không có API nào cho client tự insert reward hoặc tự update balance.

## Monlix cần cấu hình

Monlix public HTML5 integration dùng:

```text
https://offers.monlix.com/?appid=<APP_ID>&userid=<USER_ID>&subid=adcash
```

Repo lấy App ID từ GitHub Actions repository variable:

```text
MONLIX_APP_ID
```

Workflow đưa biến này vào `VITE_MONLIX_APP_ID` cho cả web, APK và AAB.

### Postback URL

Trong Monlix Dashboard đặt callback URL thành:

```text
https://lmtcnbhdnryivjgupuct.supabase.co/functions/v1/adcash-monlix-postback?userId={{userId}}&userIp={{userIp}}&countryCode={{countryCode}}&secretKey={{secretKey}}&taskName={{taskName}}&transactionId={{transactionId}}&rewardCurrency={{rewardCurrency}}&rewardValue={{rewardValue}}&payout={{payout}}&subId={{subId}}&status={{status}}
```

Supabase Edge Function phải có secret môi trường:

```text
MONLIX_SECRET_KEY=<Secret Key của site/app trong Monlix Dashboard>
```

Secret này **không** được đưa vào React, APK, AAB hoặc GitHub repo public.

### Currency / reward

Backend hiện lấy `rewardValue` Monlix gửi về làm số VND được cộng cho user. Vì vậy site/app Monlix phải cấu hình reward currency/multiplier đúng với mô hình chia doanh thu của Adcash.

Nếu Adcash chỉ cho phép **xem video quảng cáo**, phía Monlix cũng phải cấu hình placement/site chỉ có Rewarded Video. HTML5 public docs của Monlix chỉ mô tả App ID + User ID; nếu account bật thêm offer/survey thì Monlix có thể hiển thị chúng.

## Supabase production backend

Project hiện dùng: `Bobbey` (`lmtcnbhdnryivjgupuct`).

Adcash dùng các object riêng để không đụng dữ liệu project khác:

- `adcash_wallets`
- `adcash_reward_events`
- `adcash_withdrawals`
- `adcash_apply_monlix_postback(...)`
- `adcash_request_withdrawal(...)`
- Edge Function `adcash-monlix-postback`

Schema nằm ở `supabase/schema.sql` và function source ở `supabase/functions/adcash-monlix-postback/index.ts`.

Supabase Anonymous Sign-Ins phải được bật để app tạo UUID cho user mà không bắt đăng ký tài khoản.

## Phát triển local

```bash
npm install
cp .env.example .env.local
# điền VITE_MONLIX_APP_ID
npm run dev
```

Build web:

```bash
npm run build
```

Build Android thủ công:

```bash
npm install
CAPACITOR_BUILD=1 npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug bundleDebug
```

## Web + APK + AAB tự động

Workflow `.github/workflows/build.yml` chạy mỗi khi có commit mới vào `main`:

1. Build web và deploy GitHub Pages.
2. Build lại assets bằng đường dẫn tương thích Capacitor.
3. Tạo Android project từ cùng source.
4. Xuất APK debug.
5. Xuất AAB debug.
6. Upload APK/AAB vào GitHub Actions Artifacts.

Mọi thay đổi trong `src/` đi vào cả ba bản.

## Google Play

Workflow hiện xuất debug APK/AAB để test. AAB production cần upload keystore + release signing qua GitHub Actions Secrets; không commit keystore hoặc mật khẩu vào repo public.

## Tên / package Android

- App name: `Adcash: Xem & Kiếm Thưởng`
- Android application id: `com.bobbey.adcash`
