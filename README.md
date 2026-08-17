# Adcash: Xem & Kiếm Thưởng

Một source code dùng chung cho:

- Web (Vite + React)
- Android APK (Capacitor)
- Android AAB (Capacitor)

## Trạng thái hiện tại

Ứng dụng đã có giao diện responsive và luồng demo cho:

- Trang chủ + số dư
- Danh sách nhiệm vụ thưởng
- Mô phỏng hoàn thành nhiệm vụ và cộng thưởng
- Ví + lịch sử giao dịch
- Rút tiền qua MoMo / ngân hàng (mô phỏng)
- Hồ sơ người dùng
- Lưu trạng thái demo bằng localStorage
- Schema Supabase an toàn ở `supabase/schema.sql`

> Phần thưởng hiện tại là dữ liệu demo. Production không được tin dữ liệu cộng tiền từ client. Chỉ backend/postback đã xác minh mới được ghi `earning_events` và cập nhật `wallets`.

## Phát triển local

```bash
npm install
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

1. Build web và deploy lên GitHub Pages.
2. Build lại asset theo đường dẫn tương thích Capacitor.
3. Tạo Android project từ cùng source.
4. Xuất APK debug.
5. Xuất AAB debug.
6. Upload APK/AAB vào Artifacts của GitHub Actions.

Vì cả ba bản dùng chung `src/`, mọi chỉnh sửa giao diện/logic trong source sẽ đi vào cả web, APK và AAB ở lần build tiếp theo.

## AAB để đưa lên Google Play

Workflow hiện xuất **debug APK/AAB** để test tự động. AAB đưa lên Google Play nên được ký bằng upload key riêng. Không commit keystore hoặc mật khẩu vào repo public; hãy lưu chúng trong GitHub Actions Secrets và thêm bước release signing khi chuẩn bị phát hành.

## Backend Supabase

File `supabase/schema.sql` chứa cấu trúc:

- `profiles`
- `wallets`
- `reward_tasks`
- `earning_events`
- `withdrawals`
- RLS cho dữ liệu người dùng
- Trigger khởi tạo profile + wallet

Thiết kế cố ý **không cho client tự insert earning event, tự sửa balance hoặc tự tạo withdrawal trực tiếp**. Các thao tác tài chính production phải qua server/Edge Function đáng tin cậy để chống gian lận và replay.

## Tên / package Android

- App name: `Adcash: Xem & Kiếm Thưởng`
- Android application id: `com.bobbey.adcash`
