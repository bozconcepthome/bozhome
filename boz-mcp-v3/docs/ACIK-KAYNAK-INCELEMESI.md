# Açık kaynak beceriler ve araçların incelenmesi

Tüm depolar 2026-11-26 tarihinde sığ klonlandı ve **okunarak** incelendi. Hiçbir depodan kod çalıştırılmadı, projeye kopyalanmadı
veya bağımlılık olarak eklenmedi (MCP Inspector hariç: yalnızca geliştirme makinesinde test aracı olarak kullanıldı).

| Proje | Son commit | Lisans | Kullanım | Değerlendirme |
|---|---|---|---|---|
| anthropics/skills — **mcp-builder** | 2026-11-16 | Apache-2.0 | ✅ Uygulandı | Araç açıklamalarının seçim için net olması, `readOnlyHint/destructiveHint/idempotentHint/openWorldHint` anotasyonları, yapılandırılmış çıktı, sayfalama ve eylem odaklı isimlendirme. Servis öneki önerisi (`trendyol_…`) yerine sizin belirttiğiniz araç adları korundu. |
| anthropics/skills — **skill-creator** | 2026-11-16 | Apache-2.0 | ✅ Uygulandı | `skills/boz-business-intel/SKILL.md` biçimi (YAML `name`/`description`, tetikleyici odaklı açıklama). |
| obra/superpowers | 2026-11-03 | MIT | ✅ Yöntem olarak | *Systematic Debugging* (her hatada kök neden: ör. v2 sayfalama 400, tahmin trend hatası, iade API yavaşlığı), *TDD* (sahte API ile 64 test), *Verification Before Completion* (tüm araçlar gerçek veriyle çalıştırıldı, iddialar kanıtla), *Writing Plans*. |
| trailofbits/skills | 2026-11-12 | CC BY-SA 4.0 | ✅ Kontrol listesi olarak | *insecure-defaults* (fail-closed: token yoksa HTTP başlamaz, 127.0.0.1, bildirim kapalı, URL token kapalı), *sharp-edges* (systemd satır içi yorum tuzağı, log maskeleme sırası), *supply-chain-risk-auditor* (az bağımlılık, kilit dosyası, pip-audit). |
| borghei/Claude-Skills | 2026-11-24 | MIT + **Commons Clause** | ⚠️ Yalnızca okundu | Commons Clause ticari "satış" kısıtı içerir; kod/metin projeye **alınmadı**. Başlıklar (api-design-reviewer, database-designer, dependency-auditor, data-quality-auditor) genel kontrol fikri olarak gözden geçirildi. |
| modelcontextprotocol/inspector | 2026-11-18 (v2.16.0) | MIT→Apache geçişinde | ✅ Test aracı | stdio ve Streamable HTTP üzerinden `tools/list`, `tools/call`, geçersiz parametre, Bearer ve URL token testleri. |

## Ek araştırma — Trendyol / e-ticaret
- Trendyol için resmi bir Python SDK veya bakımı süren güvenilir açık kaynak istemci bulunamadı; topluluk paketleri eski v1
  uç noktalarını kullanıyor ve yazma işlemlerini de kapsıyor. Bu nedenle **kendi salt okunur istemcimiz** yazıldı (≈250 satır,
  denetlenebilir).
- İstatistik/tahmin için ağır bağımlılıklar (pandas, statsmodels, prophet) eklenmedi: sunucu maliyetini ve saldırı yüzeyini
  artırırlar. Sönümlü Holt + mevsimsel ortalama + geriye dönük test standart kütüphaneyle yazıldı.

## Yüklenen beceriler
Sunucuya hiçbir üçüncü taraf beceri yüklenmedi. Boz Concept Home'a özel kalıcı beceri: `skills/boz-business-intel/`.
