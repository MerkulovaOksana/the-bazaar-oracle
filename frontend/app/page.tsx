import Link from "next/link";

const heroes = [
  {
    name: "Vanessa",
    role: "Corsair Commander",
    img: "https://thebazaar.wiki.gg/images/thumb/a/a1/Bazaar-avatar-vanessa.jpg/200px-Bazaar-avatar-vanessa.jpg",
    color: "from-red-500/30 to-transparent",
  },
  {
    name: "Pygmalien",
    role: "Entre-Pig-Neur",
    img: "https://thebazaar.wiki.gg/images/thumb/1/12/Bazaar-avatar-pygmalien.jpg/200px-Bazaar-avatar-pygmalien.jpg",
    color: "from-blue-500/30 to-transparent",
  },
  {
    name: "Dooley",
    role: "AI-Liberating Robot",
    img: "https://thebazaar.wiki.gg/images/thumb/b/bd/Bazaar-avatar-dooley.jpg/200px-Bazaar-avatar-dooley.jpg",
    color: "from-cyan-500/30 to-transparent",
  },
  {
    name: "Mak",
    role: "Alchemical Immortalist",
    img: "https://thebazaar.wiki.gg/images/thumb/4/48/Bazaar-avatar-mak.jpg/200px-Bazaar-avatar-mak.jpg",
    color: "from-green-500/30 to-transparent",
  },
  {
    name: "Stelle",
    role: "Bright Aeronaut",
    img: "https://thebazaar.wiki.gg/images/thumb/0/0f/Bazaar-avatar-stelle.jpg/200px-Bazaar-avatar-stelle.jpg",
    color: "from-amber-500/30 to-transparent",
  },
  {
    name: "Jules",
    role: "Chef of the Deeps",
    img: "https://thebazaar.wiki.gg/images/thumb/2/2f/Bazaar-avatar-jules.jpg/200px-Bazaar-avatar-jules.jpg",
    color: "from-purple-500/30 to-transparent",
  },
  {
    name: "Karnok",
    role: "Monstrous Hunter",
    img: "https://playthebazaar.com/images/characterThumbs/Skin_KAR_01a_Thumb.webp",
    color: "from-rose-500/30 to-transparent",
  },
];

const features = [
  {
    icon: "📸",
    title: "Анализ скриншотов",
    desc: "GPT-4 Vision распознаёт все предметы на обеих досках по одному скриншоту",
  },
  {
    icon: "⚔",
    title: "Симуляция боя",
    desc: "Движок с multicast, cooldown, freeze, burn, poison, haste, slow и щитами",
  },
  {
    icon: "🤖",
    title: "RAG-ассистент",
    desc: "ИИ-чат отвечает на вопросы о механиках на основе базы знаний игры",
  },
  {
    icon: "🎤",
    title: "Голосовой ввод",
    desc: "Задавай вопросы голосом — Speech-to-Text на базе Whisper",
  },
  {
    icon: "📱",
    title: "Telegram-бот",
    desc: "Отправь скриншот в Telegram — получи предсказание мгновенно",
  },
  {
    icon: "📊",
    title: "Статистика и аналитика",
    desc: "Дашборд с историей предсказаний, винрейтом и воронкой",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[85vh] flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-bazaar-purple/30 via-bazaar-bg to-bazaar-bg" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-bazaar-accent/40 to-transparent" />

        <div className="relative flex flex-col items-center text-center px-4 pt-8 pb-16">
          {/* Official game logo */}
          <img
            src="https://playthebazaar.com/images/bazaarLogo_small.webp"
            alt="The Bazaar"
            className="h-16 md:h-20 mb-6 drop-shadow-[0_0_20px_rgba(201,168,76,0.4)]"
          />

          <h1 className="text-4xl md:text-6xl font-extrabold mb-1 gradient-text text-glow leading-tight">
            Oracle
          </h1>
          <p className="text-base md:text-lg text-bazaar-accent font-medium mb-5 tracking-[0.25em] uppercase">
            Предсказатель PvE-боёв
          </p>

          {/* Decorative divider */}
          <img
            src="https://playthebazaar.com/images/pagebreak_brown.webp"
            alt=""
            className="w-48 mb-5 opacity-60"
          />

          <p className="text-lg md:text-xl text-bazaar-muted max-w-xl mb-8 leading-relaxed">
            Загрузи скриншот боя в The Bazaar — ИИ распознает доски и предскажет, победишь ты или нет
          </p>

          <div className="flex gap-4 flex-wrap justify-center">
            <Link
              href="/auth"
              className="bg-gold-gradient hover:brightness-110 text-bazaar-bg font-bold px-8 py-3.5 rounded-xl text-lg transition shadow-lg shadow-bazaar-accent/30"
            >
              Попробовать бесплатно
            </Link>
            <a
              href="#how-it-works"
              className="border-2 border-bazaar-accent/40 hover:border-bazaar-accent text-bazaar-warm px-8 py-3.5 rounded-xl text-lg transition"
            >
              Как это работает
            </a>
          </div>
        </div>
      </section>

      {/* Game board showcase */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2 text-bazaar-warm">
          Как это работает
        </h2>
        <p className="text-center text-bazaar-muted mb-8">
          Три шага до предсказания
        </p>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="bg-card-gradient rounded-xl border border-bazaar-accent/15 p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-bazaar-accent/20 flex items-center justify-center text-xl font-bold text-bazaar-accent">1</div>
            <h3 className="text-bazaar-warm font-semibold mb-1">Сделай скриншот</h3>
            <p className="text-sm text-bazaar-muted">Скриншот PvE-боя из игры или собери билд вручную</p>
          </div>
          <div className="bg-card-gradient rounded-xl border border-bazaar-accent/15 p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-bazaar-accent/20 flex items-center justify-center text-xl font-bold text-bazaar-accent">2</div>
            <h3 className="text-bazaar-warm font-semibold mb-1">Загрузи в Oracle</h3>
            <p className="text-sm text-bazaar-muted">GPT-4 Vision распознает предметы на обеих досках</p>
          </div>
          <div className="bg-card-gradient rounded-xl border border-bazaar-accent/15 p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-bazaar-accent/20 flex items-center justify-center text-xl font-bold text-bazaar-accent">3</div>
            <h3 className="text-bazaar-warm font-semibold mb-1">Получи результат</h3>
            <p className="text-sm text-bazaar-muted">Движок симулирует бой и покажет исход с логом</p>
          </div>
        </div>

        {/* Game board screenshot */}
        <div className="relative rounded-2xl overflow-hidden border border-bazaar-accent/20 shadow-2xl shadow-bazaar-purple/20">
          <img
            src="https://playthebazaar.com/images/karnok/karnok-enrage.jpg"
            alt="The Bazaar — игровой бой"
            className="w-full"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bazaar-bg/80 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-center">
            <p className="text-sm text-bazaar-warm font-medium">
              Бой в The Bazaar — предметы, способности, эффекты
            </p>
          </div>
        </div>
      </section>

      {/* Heroes showcase */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-center gap-3 mb-2">
          <img
            src="https://playthebazaar.com/images/pagebreak_brown.webp"
            alt=""
            className="w-24 opacity-40 rotate-180"
          />
          <h2 className="text-2xl md:text-3xl font-bold text-bazaar-warm whitespace-nowrap">
            Герои игры
          </h2>
          <img
            src="https://playthebazaar.com/images/pagebreak_brown.webp"
            alt=""
            className="w-24 opacity-40"
          />
        </div>
        <p className="text-center text-bazaar-muted mb-8 text-sm">
          Все 7 героев The Bazaar — проверяй билды каждого
        </p>

        <div className="grid grid-cols-4 md:grid-cols-7 gap-3 md:gap-4">
          {heroes.map((h) => (
            <div
              key={h.name}
              className="group flex flex-col items-center text-center"
            >
              <div className={`relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-bazaar-accent/30 group-hover:border-bazaar-gold transition-all group-hover:shadow-lg group-hover:shadow-bazaar-accent/20 mb-2 bg-gradient-to-b ${h.color}`}>
                <img
                  src={h.img}
                  alt={h.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <span className="text-xs md:text-sm font-semibold text-bazaar-warm">
                {h.name}
              </span>
              <span className="text-[10px] md:text-xs text-bazaar-muted hidden md:block">{h.role}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Demo prediction */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="bg-card-gradient rounded-2xl border border-bazaar-accent/20 p-6 md:p-8">
          <p className="text-center text-bazaar-muted text-xs mb-4 uppercase tracking-widest">
            Пример предсказания
          </p>
          <div className="flex items-center justify-center gap-6 md:gap-12 mb-6">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-bazaar-green mb-2 shadow-lg shadow-bazaar-green/20">
                <img
                  src="https://thebazaar.wiki.gg/images/thumb/a/a1/Bazaar-avatar-vanessa.jpg/200px-Bazaar-avatar-vanessa.jpg"
                  alt="Vanessa"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-sm font-semibold text-bazaar-green">Vanessa</span>
              <span className="text-xs text-bazaar-muted">500 HP</span>
            </div>
            <div className="text-center">
              <span className="text-3xl md:text-4xl font-black text-bazaar-accent">VS</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-bazaar-red mb-2 shadow-lg shadow-bazaar-red/20">
                <img
                  src="https://thebazaar.wiki.gg/images/Monster_Dragon_Portrait.png"
                  alt="Dragon"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-sm font-semibold text-bazaar-red">Dragon</span>
              <span className="text-xs text-bazaar-muted">3675 HP</span>
            </div>
          </div>
          <div className="text-center">
            <div className="inline-block bg-bazaar-red/15 border border-bazaar-red/30 text-bazaar-red font-bold px-6 md:px-8 py-3 rounded-xl text-lg md:text-xl">
              ПОРАЖЕНИЕ — Dragon слишком силён!
            </div>
            <p className="text-xs text-bazaar-muted mt-3">
              42 каста • 28.5с боя • Dragon — Legendary Day 8 босс
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2 text-bazaar-warm">
          Возможности
        </h2>
        <p className="text-center text-bazaar-muted mb-10">
          Полный набор инструментов для PvE
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
        <div className="bg-card-gradient rounded-2xl border border-bazaar-accent/20 p-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-bazaar-accent/30 to-transparent" />
          <img
            src="https://playthebazaar.com/images/bazaarLogo_small.webp"
            alt="The Bazaar"
            className="h-10 mx-auto mb-4 opacity-60"
          />
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
            Начать бесплатно
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-bazaar-accent/10 py-8 text-center text-sm text-bazaar-muted">
        <img
          src="https://playthebazaar.com/images/bazaarLogo_small.webp"
          alt="The Bazaar"
          className="h-6 mx-auto mb-3 opacity-40"
        />
        <span className="text-bazaar-accent font-medium">The Bazaar Oracle</span>
        {" "}&mdash; Предсказатель PvE-боёв • Не аффилирован с AVY Entertainment
      </footer>
    </div>
  );
}
