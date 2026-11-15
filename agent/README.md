# 🤖 Boz Agent — Bilgisayarını kullanan animasyonlu asistan

Boz, ekranının köşesinde duran, sevimli ve **bol animasyonlu** bir robottur.
Ona Türkçe bir görev yazarsın; o da ekranına bakar, fareyi ve klavyeyi kullanarak
işi senin yerine yapar.

Beyni **ChatGPT aboneliğindir** (Plus / Pro). Bunun için OpenAI'nin resmi
**Codex CLI** aracını kullanır. API anahtarı gerekmez, ek ücret ödemezsin;
kullanım ChatGPT planının Codex limitinden düşer.

```
 Sen ──► Boz penceresi (animasyonlar) ──► Codex CLI (ChatGPT girişin)
                                              │
                                              ▼
                              pc_tools_server.py (ekran, fare, klavye)
```

## Kurulum (Windows 10 / 11)

1. Bu `agent` klasörünü bilgisayarına indir (GitHub'da **Code → Download ZIP**,
   sonra ZIP'i aç).
2. `kur.bat` dosyasına **çift tıkla**. Kurulum betiği şunları yapar:
   - Python ve Node.js yoksa kurar (kurduktan sonra pencereyi kapatıp
     `kur.bat`'ı **bir kez daha** çalıştırman gerekir),
   - gerekli paketleri ve Codex CLI'ı kurar,
   - masaüstüne **Boz Agent** kısayolu ekler,
   - tarayıcıda ChatGPT girişini açar. Orada **"Sign in with ChatGPT"** seç.
3. Masaüstündeki **Boz Agent** simgesine çift tıkla. 🎉

> Windows "bilinmeyen yayımcı" uyarısı verirse **Ek bilgi → Yine de çalıştır** de.

## Kullanım

- Alttaki kutuya bir görev yaz, ör. *"Not Defteri'ni aç ve bir şiir yaz"*.
- Boz çalışırken her adımı (📸 ekrana bakma, 🖱️ tıklama, ⌨️ yazma, 💻 komut)
  sohbette canlı olarak görürsün. Robot da yaptığı işe göre animasyon oynatır.
- **◱** düğmesi Boz'u **mini moda** alır (sadece robot kalır). Robota tıklayınca geri açılır.
- **⚙ Ayarlar**:
  - **Onaylı mod** (varsayılan, önerilir): her tıklama, yazma ve program açmadan
    önce "İzin veriyor musun?" diye sorar.
  - **Serbest mod**: sormadan çalışır. Sadece güvendiğin işlerde kullan.
  - **Sesli konuşma**: Boz cevaplarını Türkçe sesli okur.
  - **Yeni sohbet**: önceki konuşmayı unutup baştan başlar.

### 🛑 Acil durdurma
- Kırmızı **■** düğmesine bas, **veya**
- fareyi hızla ekranın **sol üst köşesine** götür (fare ve klavye işlemleri anında durur).

## Animasyonlar

| Durum | Boz ne yapar |
|---|---|
| Boşta | Süzülür, göz kırpar, gözleriyle fareni takip eder |
| Yazarken | Kulaklarını oynatıp dikkatle dinler |
| Düşünürken | Etrafında renkli toplar döner, anteni hızlı yanıp söner |
| Ekrana bakarken | Kamera flaşı patlar, yüzünden tarama çizgisi geçer |
| Tıklarken | Zıplar, eli uzanır, fare imleci ve dalga efekti çıkar |
| Yazı yazarken | Elleri klavyede hızlı hızlı tıklar |
| Konuşurken | Ağzı hareket eder, cevap daktilo gibi yazılır |
| Bitince | Sevinçle zıplar, konfeti patlar 🎊 |
| Hata olunca | Kırmızıya döner, başını sallar |
| 90 sn işsizse | Uyur 💤 |

Arka plandaki parçacıklar da Boz'un ruh haline göre renk ve hız değiştirir.

## Sorun giderme

| Sorun | Çözüm |
|---|---|
| "Codex CLI bulunamadı" | `kur.bat`'ı tekrar çalıştır. |
| "ChatGPT hesabına giriş yapılmamış" | Ayarlar → **ChatGPT ile giriş yap**. |
| "Kullanım limitine ulaşıldı" | ChatGPT planının Codex limiti doldu; biraz bekle. |
| Yanlış yere tıklıyor | Windows ekran ölçeği %100/125/150 desteklenir. Birden fazla monitörde Boz sadece **ana ekranı** kullanır. |
| Pencere açılmıyor | [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)'ı kur. |
| Hata ayrıntısı görmek | `C:\Users\<adın>\BozAgent\hata.log` dosyasına bak veya komut isteminde: `.venv\Scripts\python.exe app.py --debug` |

## Güvenlik notları

- Boz bilgisayarında gerçekten tıklar ve yazar. İlk zamanlarda **Onaylı mod**da kullan.
- Şifre, kart bilgisi veya para gönderme gibi işleri ona yaptırma.
- Ekran görüntüleri yalnızca görevi yapmak için ChatGPT'ye (OpenAI) gönderilir.
- Boz'un çalışma klasörü: `C:\Users\<adın>\BozAgent\calisma`. Ayarlar: `...\BozAgent\ayarlar.json`.

## Dosyalar

| Dosya | Görevi |
|---|---|
| `app.py` | Pencereyi açar, arayüzü Codex'e bağlar |
| `codex_bridge.py` | `codex exec --json` çalıştırır, olayları arayüze aktarır |
| `pc_tools_server.py` | Ekran görüntüsü, tıklama, yazma… (MCP sunucusu) |
| `AGENTS.md` | Boz'un kişiliği ve güvenlik kuralları |
| `ui/` | Animasyonlu arayüz (HTML / CSS / JS) |
| `kur.bat`, `baslat.bat` | Kurulum ve başlatma |

İpucu: `ui/index.html` dosyasını tarayıcıda açarsan **demo modunda** animasyonları
bilgisayar kontrolü olmadan izleyebilirsin.
