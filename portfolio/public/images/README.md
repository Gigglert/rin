# Картинки сайта

Кладите сюда иллюстрации, а потом указывайте путь к ним в `content/en.yml` и `content/ru.yml`.
Путь пишется от папки `public`, то есть начинается с `/images/...`.

| Что | Куда положить | Что написать в YAML | Размер |
|---|---|---|---|
| Фото в карточке на первом экране | `public/images/photo.jpg` | `hero → card → photo: "/images/photo.jpg"` | квадрат от 256×256 |
| Обложка кейса | `public/images/cases/veeam.png` | у кейса `image: "/images/cases/veeam.png"` | 16:9, от 1200×675 |
| Логотип компании в полосе с цифрами | `public/images/logos/veeam.svg` | `stats → companies → logo: "/images/logos/veeam.svg"` | SVG или PNG, высота от 56 px |
| Логотип в блоке «Опыт» | `public/images/logos/veeam.svg` | у места работы `logo: "/images/logos/veeam.svg"` | квадрат, от 80×80 |

Советы:
- Имена файлов латиницей, без пробелов: `it-medical-cover.png`, а не `Обложка IT Medical.png`.
- JPG для фото, PNG или WebP для скриншотов, SVG для логотипов.
- Файл до 500 КБ, иначе сайт будет грузиться медленнее. Сжать можно на squoosh.app.
- Логотипы в полосе компаний автоматически становятся серыми, чтобы смотреться единым рядом.
