# Adcash: Xem & Kiếm Thưởng

Một source code dùng chung cho:

- Web (Vite + React)
- Android APK (Capacitor)
- Android AAB (Capacitor)

## Trạng thái hiện tại

Backend cũ đã được gỡ khỏi repo.

Hiện tại:

1. Giao diện web/app vẫn dùng chung source React/Vite.
2. Không còn Auth, database, RPC hoặc Edge Function trong repo.
3. Ví đang ở trạng thái chưa kết nối backend và không tự cộng số dư.
4. Rút tiền chưa tạo giao dịch thật cho tới khi có backend thay thế.
5. Phần Monlix vẫn có thể hiển thị nếu cấu hình `MONLIX_APP_ID`, nhưng không còn callback/database reward đi kèm.

## Monlix

HTML5 integration hiện dùng:

```text
https://offers.monlix.com/?appid=<APP_ID>&userid=<USER_ID>&subid=adcash
```

Repo lấy App ID từ GitHub Actions repository variable:

```text
MONLIX_APP_ID
```

Workflow đưa biến này vào `VITE_MONLIX_APP_ID` cho cả web, APK và AAB.

`USER_ID` hiện là ID cục bộ được tạo trên thiết bị, không phải tài khoản backend.

## Phát triển local

```bash
npm install
cp .env.example .env.local
# điền VITE_MONLIX_APP_ID nếu còn dùng Monlix
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
