import Link from "next/link";

const heroes = [
  {
    name: "Pygmalien",
    img: "https://thebazaar.wiki.gg/images/thumb/1/12/Bazaar-avatar-pygmalien.jpg/200px-Bazaar-avatar-pygmalien.jpg",
    desc: "Мастер исцеления и щитов",
  },
  {
    name: "Vanessa",
    img: "https://thebazaar.wiki.gg/images/thumb/a/a1/Bazaar-avatar-vanessa.jpg/200px-Bazaar-avatar-vanessa.jpg",
    desc: "Ядовитый ассасин",
  },
  {
    name: "Dooley",
    img: "https://thebazaar.wiki.gg/images/thumb/b/bd/Bazaar-avatar-dooley.jpg/200px-Bazaar-avatar-dooley.jpg",
    desc: "Инженер со щитами",
  },
  {
    name: "Mak",
    img: "https://thebazaar.wiki.gg/images/thumb/4/48/Bazaar-avatar-mak.jpg/200px-Bazaar-avatar-mak.jpg",
    desc: "Берсерк ближнего боя",
  },
  {
    name: "Stelle",
    img: "https://thebazaar.wiki.gg/images/thumb/0/0f/Bazaar-avatar-stelle.jpg/200px-Bazaar-avatar-stelle.jpg",
    desc: "Маг стихий",
  },
  {
    name: "Quixel",
    img: "https://thebazaar.wiki.gg/images/thumb/8/80/Bazaar-avatar-quixel.jpg/200px-Bazaar-avatar-quixel.jpg",
    desc: "Хаотичный изобретатель",
  },
];

const features = [
  {
    icon: "📷",
    title: "Анализ скриншотов",
    desc: "Загрузи скриншот PvE-боя — ИИ распознает все предметы на обеих досках",
  },
  {
    icon: "⚔",
    title: "Симуляция боя",
    desc: "Полноценный движок с multicast, cooldown, freeze, burn, poison, haste/slow и щитами",
  },
  {
    icon: "🤖",
    title: "RAG-ассистент",
    desc: "Спроси что угодно о механиках игры — ИИ ответит на основе базы знаний",
  },
  {
    icon: "🎤",
    title: "Голосовой ввод",
    desc: "Задавай вопросы голосом — Speech-to-Text на базе Whisper",
  },
  {
    icon: "📱",
    title: "Telegram-бот",
    desc: "Отправь скриншот прямо в Telegram и получи предсказание",
  },
  {
    icon: "📊",
    title: "Дашборд аналитики",
    desc: "Отслеживай историю предсказаний, винрейт и статистику использования",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-bazaar-purple/20 via-transparent to-transparent" />
        <div className="relative flex flex-col items-center justify-center text-center px-4 pt-20 pb-12">
          <div className="mb-4 text-5xl">🔮</div>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-2 gradient-text text-glow leading-tight">
            The Bazaar Oracle
          </h1>
          <p className="text-lg text-bazaar-accent font-medium mb-4 tracking-wide uppercase">
            Предсказатель боёв
          </p>
          <p className="text-xl text-bazaar-muted max-w-2xl mb-8 leading-relaxed">
            Загрузи скриншот PvE-сражения в The Bazaar — получи мгновенное
            предсказание, победишь ты или нет. ИИ-анализ + симуляция боя.
          </p>
          <div className="flex gap-4 flex-wrap justify-center">
            <Link
              href="/auth"
              className="bg-gold-gradient hover:brightness-110 text-bazaar-bg font-bold px-8 py-3.5 rounded-xl text-lg transition shadow-lg shadow-bazaar-accent/30"
            >
              Попробовать бесплатно
            </Link>
            <a
              href="#features"
              className="border-2 border-bazaar-accent/40 hover:border-bazaar-accent text-bazaar-warm px-8 py-3.5 rounded-xl text-lg transition"
            >
              Как это работает
            </a>
          </div>
        </div>
      </section>

      {/* Heroes showcase */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-center mb-2 text-bazaar-warm">
          Герои The Bazaar
        </h2>
        <p className="text-center text-bazaar-muted mb-8 text-sm">
          Проверяй свои билды против любых PvE-монстров
        </p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {heroes.map((h) => (
            <div
              key={h.name}
              className="group flex flex-col items-center text-center"
            >
              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-bazaar-accent/40 group-hover:border-bazaar-gold transition-all group-hover:shadow-lg group-hover:shadow-bazaar-accent/20 mb-2">
                <img
                  src={h.img}
                  alt={h.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <span className="text-sm font-semibold text-bazaar-warm">
                {h.name}
              </span>
              <span className="text-xs text-bazaar-muted">{h.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Demo */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="bg-card-gradient rounded-2xl border border-bazaar-accent/20 p-8">
          <p className="text-center text-bazaar-muted text-sm mb-4 uppercase tracking-wider">
            Пример предсказания
          </p>
          <div className="flex items-center justify-center gap-8 md:gap-12 mb-6">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-bazaar-surface border-2 border-bazaar-green flex items-center justify-center text-3xl mb-2">
                🧙
              </div>
              <span className="text-sm font-semibold text-bazaar-green">Игрок</span>
              <span className="text-xs text-bazaar-muted">500 HP</span>
              <div className="flex gap-1 mt-2">
                <span className="text-xs bg-bazaar-surface px-2 py-0.5 rounded border border-bazaar-accent/20">
                  Глефа
                </span>
                <span className="text-xs bg-bazaar-surface px-2 py-0.5 rounded border border-bazaar-accent/20">
                  Кинжалы
                </span>
              </div>
            </div>
            <div className="text-center">
              <span className="text-3xl font-black text-bazaar-accent">VS</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-bazaar-surface border-2 border-bazaar-red flex items-center justify-center text-3xl mb-2">
                🐉
              </div>
              <span className="text-sm font-semibold text-bazaar-red">Дракончик</span>
              <span className="text-xs text-bazaar-muted">450 HP</span>
              <div className="flex gap-1 mt-2">
                <span className="text-xs bg-bazaar-surface px-2 py-0.5 rounded border border-bazaar-accent/20">
                  🔥 Огненный
                </span>
                <span className="text-xs bg-bazaar-surface px-2 py-0.5 rounded border border-bazaar-accent/20">
                  🛡 Эгида
                </span>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="inline-block bg-bazaar-green/15 border border-bazaar-green/30 text-bazaar-green font-bold px-8 py-3 rounded-xl text-xl">
              ✅ ПОБЕДА — 327 HP осталось
            </div>
            <p className="text-xs text-bazaar-muted mt-3">
              20 кастов • 10.8 секунд боя • 2 крита • Freeze на 3.5с
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="text-3xl font-bold text-center mb-2 text-bazaar-warm">
          Возможности
        </h2>
        <p className="text-center text-bazaar-muted mb-10">
          Всё, что нужно для победы в PvE
        </p>
        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-card-gradient rounded-xl border border-bazaar-accent/15 p-6 hover:border-bazaar-accent/40 hover:shadow-lg hover:shadow-bazaar-purple/10 transition-all group"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2 text-bazaar-warm">
                {f.title}
              </h3>
              <p className="text-sm text-bazaar-muted leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 pb-20 text-center">
        <div className="bg-card-gradient rounded-2xl border border-bazaar-accent/20 p-10">
          <h2 className="text-2xl font-bold text-bazaar-warm mb-3">
            Готов узнать исход боя?
          </h2>
          <p className="text-bazaar-muted mb-6">
            Загрузи скриншот или собери билд вручную — Oracle предскажет результат за секунды
          </p>
          <Link
            href="/auth"
            className="inline-block bg-gold-gradient hover:brightness-110 text-bazaar-bg font-bold px-10 py-3.5 rounded-xl text-lg transition shadow-lg shadow-bazaar-accent/30"
          >
            Начать
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-bazaar-accent/10 py-8 text-center text-sm text-bazaar-muted">
        <span className="text-bazaar-accent font-medium">The Bazaar Oracle</span>
        {" "}&mdash; Предсказатель PvE-боёв • Не аффилирован с Tempo Storm
      </footer>
    </div>
  );
}
