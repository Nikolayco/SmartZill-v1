# 🎵 NikolayCo SmartZill - Automated Bell & Music Scheduler

**NikolayCo SmartZill**, workplaces (factories, schools, offices) is a modern, comprehensive and user-friendly automation system designed to manage **bells**, **announcements** and **music broadcasting**. It works as a Desktop application via **Web Interface**.

---

## 🇹🇷 Türkçe (Turkish)

### 🌟 Özellikler

*   **Modern Web Arayüzü:** Yönetimi kolay, Next.js tabanlı, duyarlı (responsive) tasarım.
*   **Çoklu Dil Desteği:** 🇹🇷 Türkçe, 🇬🇧 English, 🇩🇪 Deutsch, 🇷🇺 Русский, 🇧🇬 Български tam arayüz desteği.
*   **Haftalık Zamanlayıcı:** Her gün için farklı aktiviteler (başlangıç, bitiş, mola) ve ziller ayarlayabilme.
*   **Akıllı Müzik Yayını:**
    *   **Mola Müzikleri:** Mola saatlerinde belirlediğiniz klasörden otomatik müzik çalar. Mesai başladığında otomatik susar.
    *   **Smart Start (Akıllı Başlangıç):** Uygulama açıldığında o anki saati kontrol eder. Eğer mola saatindeyse müziği başlatır, çalışma saatindeyse sessizce hazır bekler.
    *   **Canlı Radyo (Kesintisiz):** Yerel MP3 dosyaları yerine internet radyosu çalabilme. **Yeni:** Kopma veya donma durumunda otomatik yeniden bağlanma ve iyileştirme özelliği eklendi.
    *   **Manuel Kontrol:** İstediğiniz an müziği manuel olarak açıp kapatabilme.
*   **Ses Kütüphanesi:**
    *   Ziller, Anonslar ve Müzik dosyaları için sürükle-bırak yükleme desteği.
    *   **Gelişmiş TTS (Metin Okuma):** Yazdığınız metni **Doğal İnsan Sesiyle** (Edge TTS) seslendirir.
    *   **Geniş Ses Seçenekleri:** Türkçe, İngilizce, Almanca, Rusça ve Bulgarca dilleri için ayrı ayrı Kadın ve Erkek doğal ses motorları.
    *   **Anlık Duyuru Geçmişi:** Yapılan anlık duyurular geçici bir listeye kaydedilir, böylece tekrar yazmaya gerek kalmadan tek tıkla yeniden oynatılabilir.
*   **Gelişmiş Ayarlar:**
    *   **Başlangıç Kontrolü:** Uygulamanın ve web arayüzünün otomatik açılış davranışlarını özelleştirme.
    *   **Tema Seçenekleri:** Göz yormayan modern renk temaları.
*   **Özel Günler & Doğum Günleri:**
    *   Personel listesi yükleyerek doğum günlerinde otomatik kutlama anonsu yapabilme.
    *   Excel şablonu ile toplu kişi yükleme.
*   **Resmi Tatiller:** Türkiye (veya seçilen ülke) resmi tatillerini otomatik internetten çeker ve o günlerde sistemi sessize alır.
*   **Yedekleme:** Tüm ayarları ve programı JSON veya Excel olarak dışa aktarma/içe aktarma.
*   **Ağ Yayını (Streaming):** Çalan müziği yerel ağ üzerinden (VLC vb. ile dinlemek için) yayınlayabilme.

---

## 🇬🇧 English

### 🌟 Features

*   **Multi-language Support:** Full interface support for 🇹🇷 Turkish, 🇬🇧 English, 🇩🇪 German, 🇷🇺 Russian, and 🇧🇬 Bulgarian.
*   **Modern Web Interface:** Easy-to-manage, Next.js based, responsive design.
*   **Weekly Scheduler:** Set different activities (start, end, break), bells, and announcements for each day of the week.
*   **Smart Music Broadcasting:**
    *   **Break Music:** Automatically plays music from your local library during break times. Fades out when work starts.
    *   **Smart Start:** When the app launches, it checks the current time. If it's break time, music starts automatically. If it's work time, it stays silent in standby.
    *   **Live Radio (Robust):** Option to stream internet radio instead of local MP3s. **New:** Includes auto-reconnect and anti-stall protection features.
    *   **Manual Control:** Override the schedule to play/pause music manually.
*   **Audio Library:**
    *   Drag-and-drop support for Bells, Announcements, and Music files.
    *   **Advanced TTS (Text-to-Speech):** Converts text into **Natural Human Speech** (via Edge TTS).
    *   **Wide Voice Selection:** Natural Male and Female voice engines available for Turkish, English, German, Russian, and Bulgarian.
    *   **Instant Announcement History:** Instant announcements are saved to a temporary history list for quick replay without re-typing.
*   **Advanced Settings:**
    *   **Startup Control:** Customize automatic launch behavior for the App and Web Interface.
    *   **Theme Options:** Modern, eye-friendly color themes.
*   **Special Days & Birthdays:**
    *   Upload personnel lists to automatically announce birthday celebrations.
    *   Bulk import via Excel template.
*   **Public Holidays:** Automatically fetches public holidays for Turkey (or selected country) and mutes the system on those days.
*   **Backup:** Export/Import full settings and schedule via JSON or Excel.
*   **Network Streaming:** Stream the audio playback over the local network (listen via VLC, etc.).

### 🚀 Installation

For the pre-packaged (Portable) version, check the **Releases** section. Download the Zip file and run `Baslat.sh` (Linux).

### 🚀 Hızlı Kurulum / Quick Install

#### 🐧 Linux (Terminal)
```bash
# 1. Projeyi İndir / Clone Project
git clone https://github.com/Nikolayco/SmartZill.git
cd SmartZill

# 2. Çalıştır / Run
# Gerekli kurulumları (Python venv, Node_modules) otomatik yapar
# Automatically installs dependencies
chmod +x run_linux.sh
./run_linux.sh
```

#### 🪟 Windows (Adım Adım Kurulum / Step-by-Step)

**⚠️ ÖNEMLİ / IMPORTANT:**
Kurulumun eksik programları (Python, Node.js, VLC) otomatik yükleyebilmesi için kurulumu **Yönetici Olarak (Run as Administrator)** başlatmanız gerekir.

**Yöntem 1: Git Kullanarak (Komut ile) / Method 1: Using Git**
Bilgisayarınızda `git` yüklüyse en hızlı yöntemdir.
1. Başlat menüsüne `cmd` yazın, sağ tıklayıp **Yönetici Olarak Çalıştır**'ı seçin.
2. Açılan siyah ekrana şu komutları sırasıyla yapıştırıp Enter'a basın:
```cmd
git clone https://github.com/Nikolayco/SmartZill.git
cd SmartZill
run_windows.bat
```
*(Sistem otomatik olarak eksik programları kuracak, ayarları yapacak ve tarayıcıyı açacaktır.)*

**Yöntem 2: ZIP İndirerek (Git Yoksa) / Method 2: Download ZIP**
Komutlarla uğraşmak istemiyorsanız:
1. GitHub sayfasında sağ üstteki yeşil **Code** butonuna basıp **Download ZIP** seçeneğiyle indirin.
2. İndirdiğiniz ZIP dosyasını masaüstüne veya bir klasöre **çıkartın** (Klasöre Ayıkla).
3. Klasörün içine girin ve `run_windows.bat` dosyasına **Sağ Tıklayıp -> Yönetici Olarak Çalıştır** deyin.
4. Arkanıza yaslanın, kurulumun bitmesini bekleyin. ☕

#### Geliştirici Modu / Developer Mode (Manual)

1.  **Requirements:** Python 3.10+, Node.js 18+, VLC Media Player (must be installed on OS).
2.  Clone the repository.
3.  **Backend:**
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    python main.py
    ```
4.  **Frontend:**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

---

### 🛠️ Tech Stack
*   **Frontend:** Next.js (React), TailwindCSS, Lucide Icons
*   **Backend:** Python FastAPI, python-vlc, APScheduler, Pandas
*   **Tools:** PyInstaller (for packaging)

---

**License:** MIT
