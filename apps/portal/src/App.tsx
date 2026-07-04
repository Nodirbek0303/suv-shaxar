import { useState } from 'react';

const texts = {
  uz: {
    title: "Samarqand Aqlli Sug'orish Platformasi",
    subtitle:
      "Kerakli panelni tanlang. Har bir panel o'z login va ruxsatlariga ega.",
    obodonTitle: 'Obodonlashtirish boshqarmasi',
    obodonDesc:
      "Operativ boshqaruv: liniyalar, sensorlar, sug'orish, real-time monitoring.",
    obodonBtn: 'Obodonlashtirishga kirish',
    hokimiyatTitle: 'Hokimiyat monitoring',
    hokimiyatDesc:
      "Faqat ko'rish: hisobotlar, statistika, xarita va eksport.",
    hokimiyatBtn: 'Hokimiyatga kirish',
    footer: 'Samarqand shahar hokimligi · Aqlli sug\'orish tizimi',
  },
  ru: {
    title: 'Платформа умного полива Самарканда',
    subtitle:
      'Выберите нужную панель. У каждой панели свой вход и права доступа.',
    obodonTitle: 'Управление благоустройства',
    obodonDesc:
      'Оперативное управление: линии, датчики, полив, мониторинг в реальном времени.',
    obodonBtn: 'Войти в благоустройство',
    hokimiyatTitle: 'Мониторинг хокимията',
    hokimiyatDesc:
      'Только просмотр: отчёты, статистика, карта и экспорт.',
    hokimiyatBtn: 'Войти в хокимият',
    footer: 'Хокимият города Самарканд · Система умного полива',
  },
};

const OBODON_URL =
  import.meta.env.VITE_OBODON_URL ??
  (import.meta.env.PROD
    ? 'https://suv-shaxar-obodon.vercel.app/login'
    : 'http://localhost:5173/login');
const HOKIMIYAT_URL =
  import.meta.env.VITE_HOKIMIYAT_URL ??
  (import.meta.env.PROD
    ? 'https://suv-shaxar-hokimiyat.vercel.app/login'
    : 'http://localhost:5174/login');

export default function App() {
  const [lang, setLang] = useState<'uz' | 'ru'>('uz');
  const t = texts[lang];

  return (
    <div className="page">
      <div className="lang">
        <button
          type="button"
          className={lang === 'uz' ? 'active' : ''}
          onClick={() => setLang('uz')}
        >
          UZ
        </button>
        <button
          type="button"
          className={lang === 'ru' ? 'active' : ''}
          onClick={() => setLang('ru')}
        >
          RU
        </button>
      </div>

      <header className="header">
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
      </header>

      <div className="cards">
        <a className="card obodon" href={OBODON_URL}>
          <img src="/logo-obodon.png" alt="Obodonlashtirish" />
          <h2>{t.obodonTitle}</h2>
          <p>{t.obodonDesc}</p>
          <span className="btn">{t.obodonBtn}</span>
        </a>

        <a className="card hokimiyat" href={HOKIMIYAT_URL}>
          <img src="/logo-uz.png" alt="Hokimiyat" />
          <h2>{t.hokimiyatTitle}</h2>
          <p>{t.hokimiyatDesc}</p>
          <span className="btn">{t.hokimiyatBtn}</span>
        </a>
      </div>

      <footer className="footer">{t.footer}</footer>
    </div>
  );
}
