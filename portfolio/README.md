# Портфолио Head of Marketing

Сайт-портфолио на двух языках: английский на `/`, русский на `/ru`. Сделан на Next.js 14, все тексты лежат в `content/*.yml`.

- **Как менять тексты, опыт, кейсы и картинки** — [РЕДАКТИРОВАНИЕ.md](./РЕДАКТИРОВАНИЕ.md)
- **Куда класть иллюстрации** — [public/images/README.md](./public/images/README.md)

## Структура

```
content/en.yml, content/ru.yml   все тексты сайта
public/images/                    фото, обложки кейсов, логотипы
public/resume/                    PDF-резюме для кнопки «Скачать»
resume/resume-ru.html             исходник русского резюме
components/Portfolio.tsx          вёрстка секций
app/globals.css                   стили
```

## Публикация на Vercel

1. Зайдите на vercel.com через GitHub.
2. **Add New → Project**, выберите репозиторий `rin`, нажмите **Import**.
3. В поле **Root Directory** нажмите **Edit** и выберите папку `portfolio`. Остальное оставьте по умолчанию (Framework: Next.js) и нажмите **Deploy**.
4. Через 1–2 минуты сайт откроется по адресу вида `имя-проекта.vercel.app`. Ссылка доступна всем.

Дальше каждое изменение в ветке `main` публикуется автоматически.
