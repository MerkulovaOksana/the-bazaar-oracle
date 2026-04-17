import Link from "next/link";

const heroes = [
  {
    name: "Vanessa",
    role: "Corsair Commander",
    img: "https://thebazaar.wiki.gg/images/thumb/a/a1/Bazaar-avatar-vanessa.jpg/200px-Bazaar-avatar-vanessa.jpg",
    color: "border-red-400",
    glow: "shadow-red-500/40",
  },
  {
    name: "Pygmalien",
    role: "Entre-Pig-Neur",
    img: "https://thebazaar.wiki.gg/images/thumb/1/12/Bazaar-avatar-pygmalien.jpg/200px-Bazaar-avatar-pygmalien.jpg",
    color: "border-blue-400",
    glow: "shadow-blue-500/40",
  },
  {
    name: "Dooley",
    role: "AI-Liberating Robot",
    img: "https://thebazaar.wiki.gg/images/thumb/b/bd/Bazaar-avatar-dooley.jpg/200px-Bazaar-avatar-dooley.jpg",
    color: "border-cyan-400",
    glow: "shadow-cyan-500/40",
  },
  {
    name: "Mak",
    role: "Alchemical Immortalist",
    img: "https://thebazaar.wiki.gg/images/thumb/4/48/Bazaar-avatar-mak.jpg/200px-Bazaar-avatar-mak.jpg",
    color: "border-green-400",
    glow: "shadow-green-500/40",
  },
  {
    name: "Stelle",
    role: "Bright Aeronaut",
    img: "https://thebazaar.wiki.gg/images/thumb/0/0f/Bazaar-avatar-stelle.jpg/200px-Bazaar-avatar-stelle.jpg",
    color: "border-amber-400",
    glow: "shadow-amber-500/40",
  },
  {
    name: "Jules",
    role: "Chef of the Deeps",
    img: "https://thebazaar.wiki.gg/images/thumb/2/2f/Bazaar-avatar-jules.jpg/200px-Bazaar-avatar-jules.jpg",
    color: "border-purple-400",
    glow: "shadow-purple-500/40",
  },
  {
    name: "Karnok",
    role: "Monstrous Hunter",
    img: "https://playthebazaar.com/images/characterThumbs/Skin_KAR_01a_Thumb.webp",
    color: "border-rose-400",
    glow: "shadow-rose-500/40",
  },
];

const stats = [
  { value: "7", label: "героев", icon: "⚔️" },
  { value: "100+", label: "монстров", icon: "🐉" },
  { value: "630+", label: "предметов", icon: "🛡️" },
  { value: "GPT-4", label: "Vision", icon: "🔮" },
];

const features = [
  {
    icon: "📸",
    title: "Анализ скриншотов",
    desc: "GPT-4 Vision распознаёт все предметы на обеих досках по одному скриншоту",
    href: "/app/predict",
    linkLabel: "Загрузить скриншот →",
  },
  {
    icon: "⚔",
    title: "Симуляция боя",
    desc: "Движок с multicast, cooldown, freeze, burn, poison, haste, slow и щитами",
    href: "/app/predict",
    linkLabel: "Собрать билд →",
  },
  {
    icon: "🤖",
    title: "RAG-ассистент",
    desc: "ИИ-чат отвечает на вопросы о механиках на основе базы знаний игры",
    href: "/app/chat",
    linkLabel: "Открыть чат →",
  },
  {
    icon: "🎤",
    title: "Голосовой ввод",
    desc: "Задавай вопросы голосом — Speech-to-Text на базе Whisper",
    href: "/app/chat",
    linkLabel: "Попробовать →",
  },
  {
    icon: "📱",
    title: "Telegram-бот",
    desc: "Отправь скриншот в Telegram — получи предсказание мгновенно",
    href: "https://t.me/bazaar_oracle_bot",
    external: true,
    linkLabel: "@bazaar_oracle_bot →",
  },
  {
    icon: "📊",
    title: "Статистика и аналитика",
    desc: "Дашборд с историей предсказаний, винрейтом и воронкой",
    href: "/app/dashboard",
    linkLabel: "Открыть дашборд →",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* ===== HERO SECTION ===== */}
      <section className="relative overflow-hidden min-h-[100vh] flex flex-col items-center justify-center">
        {/* Multi-layer background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#2a1f4e] via-bazaar-bg to-bazaar-bg" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,92,191,0.3)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(201,168,76,0.1)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.15)_0%,transparent_50%)]" />

        {/* Animated floating orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
          <div className="orb orb-4" />
          <div className="orb orb-5" />
          <div className="orb orb-6" />
        </div>

        {/* Top decorative line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-bazaar-accent/50 to-transparent" />

        {/* Hero content */}
        <div className="relative flex flex-col items-center text-center px-4 pt-8 pb-8 max-w-5xl mx-auto w-full">
          {/* Logo with enhanced glow */}
          <div className="relative mb-4">
            <div className="absolute inset-0 blur-3xl bg-bazaar-accent/20 rounded-full scale-150" />
            <img
              src="https://playthebazaar.com/images/bazaarLogo_small.webp"
              alt="The Bazaar"
              className="relative h-20 md:h-28 drop-shadow-[0_0_30px_rgba(201,168,76,0.5)]"
            />
          </div>

          {/* Title with enhanced styling */}
          <h1 className="text-5xl md:text-7xl font-extrabold mb-1 gradient-text text-glow leading-tight">
            Oracle
          </h1>
          <p className="text-sm md:text-base text-bazaar-accent font-medium mb-4 tracking-[0.3em] uppercase">
            Предсказатель PvE-боёв
          </p>

          {/* Decorative divider */}
          <img
            src="https://playthebazaar.com/images/pagebreak_brown.webp"
            alt=""
            className="w-48 mb-4 opacity-60"
          />

          <p className="text-base md:text-lg text-bazaar-muted max-w-lg mb-6 leading-relaxed">
            Загрузи скриншот боя — ИИ распознает доски и предскажет исход
          </p>

          {/* CTA buttons */}
          <div className="flex gap-4 flex-wrap justify-center mb-8">
            <Link
              href="/auth"
              className="bg-gold-gradient hover:brightness-110 text-bazaar-bg font-bold px-8 py-3.5 rounded-xl text-lg transition shadow-lg shadow-bazaar-accent/30 hover:shadow-xl hover:shadow-bazaar-accent/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              Попробовать бесплатно
            </Link>
            <a
              href="#how-it-works"
              className="border-2 border-bazaar-accent/40 hover:border-bazaar-accent text-bazaar-warm px-8 py-3.5 rounded-xl text-lg transition hover:bg-bazaar-accent/5"
            >
              Как это работает
            </a>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 mb-10">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center group"
              >
                <span className="text-xl md:text-2xl mb-1 group-hover:scale-110 transition-transform">{s.icon}</span>
                <span className="text-xl md:text-2xl font-bold text-bazaar-accent">{s.value}</span>
                <span className="text-xs text-bazaar-muted uppercase tracking-wider">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Heroes strip */}
          <div className="w-full">
            <p className="text-xs text-bazaar-muted uppercase tracking-widest mb-4">
              Все герои The Bazaar
            </p>
            <div className="flex justify-center gap-3 md:gap-5 flex-wrap">
              {heroes.map((h) => (
                <div
                  key={h.name}
                  className="group flex flex-col items-center"
                >
                  <div
                    className={`relative w-14 h-14 md:w-[72px] md:h-[72px] rounded-full overflow-hidden border-2 ${h.color} group-hover:shadow-lg ${h.glow} transition-all duration-300 group-hover:scale-110 group-hover:border-opacity-100 border-opacity-60`}
                  >
                    <img
                      src={h.img}
                      alt={h.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[11px] md:text-xs font-semibold text-bazaar-warm mt-1.5 group-hover:text-bazaar-accent transition-colors">
                    {h.name}
                  </span>
                  <span className="text-[9px] text-bazaar-muted hidden md:block leading-tight">{h.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom fade into next section */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-bazaar-bg to-transparent" />

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce opacity-50">
          <span className="text-[10px] text-bazaar-muted uppercase tracking-wider">Scroll</span>
          <svg className="w-4 h-4 text-bazaar-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* ===== BATTLE PREVIEW SECTION ===== */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,92,191,0.08)_0%,transparent_70%)]" />

        <div className="max-w-5xl mx-auto px-4 relative">
          {/* Game board screenshot with floating overlay */}
          <div className="relative rounded-2xl overflow-hidden border border-bazaar-accent/20 shadow-2xl shadow-bazaar-purple/20 mb-12 group">
            <img
              src="https://playthebazaar.com/images/karnok/karnok-enrage.jpg"
              alt="The Bazaar — игровой бой"
              className="w-full group-hover:scale-[1.02] transition-transform duration-700"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bazaar-bg via-bazaar-bg/20 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-px flex-1 bg-gradient-to-r from-bazaar-accent/40 to-transparent" />
                <span className="text-xs text-bazaar-accent uppercase tracking-widest font-medium">Live Preview</span>
                <div className="h-px flex-1 bg-gradient-to-l from-bazaar-accent/40 to-transparent" />
              </div>
              <p className="text-sm text-bazaar-warm font-medium text-center">
                Бой в The Bazaar — предметы, способности и эффекты в реальном времени
              </p>
            </div>
          </div>

          {/* Demo prediction card */}
          <div className="bg-card-gradient rounded-2xl border border-bazaar-accent/20 p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-bazaar-accent/30 to-transparent" />
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-bazaar-red/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-bazaar-green/5 rounded-full blur-3xl" />

            <p className="text-center text-bazaar-muted text-xs mb-5 uppercase tracking-widest">
              Пример предсказания
            </p>

            <div className="flex items-center justify-center gap-6 md:gap-16 mb-6">
              {/* Player */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-bazaar-green/20 blur-xl scale-125" />
                  <div className="relative w-18 h-18 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-bazaar-green shadow-lg shadow-bazaar-green/30">
                    <img
                      src="https://thebazaar.wiki.gg/images/thumb/a/a1/Bazaar-avatar-vanessa.jpg/200px-Bazaar-avatar-vanessa.jpg"
                      alt="Vanessa"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <span className="text-sm font-bold text-bazaar-green mt-2">Vanessa</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-20 h-1.5 bg-bazaar-surface rounded-full overflow-hidden">
                    <div className="h-full bg-bazaar-green rounded-full" style={{ width: "100%" }} />
                  </div>
                  <span className="text-[10px] text-bazaar-muted">500 HP</span>
                </div>
              </div>

              {/* VS badge */}
              <div className="relative">
                <div className="absolute inset-0 bg-bazaar-accent/10 blur-2xl rounded-full scale-150" />
                <div className="relative flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-bazaar-surface border-2 border-bazaar-accent/40">
                  <span className="text-xl md:text-2xl font-black text-bazaar-accent">VS</span>
                </div>
              </div>

              {/* Monster */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-bazaar-red/20 blur-xl scale-125" />
                  <div className="relative w-18 h-18 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-bazaar-red shadow-lg shadow-bazaar-red/30">
                    <img
                      src="https://thebazaar.wiki.gg/images/Monster_Dragon_Portrait.png"
                      alt="Dragon"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <span className="text-sm font-bold text-bazaar-red mt-2">Dragon</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-20 h-1.5 bg-bazaar-surface rounded-full overflow-hidden">
                    <div className="h-full bg-bazaar-red rounded-full" style={{ width: "100%" }} />
                  </div>
                  <span className="text-[10px] text-bazaar-muted">3675 HP</span>
                </div>
              </div>
            </div>

            {/* Items row */}
            <div className="flex justify-center gap-2 mb-5 flex-wrap">
              {[
                { name: "Old Sword", icon: "⚔️" },
                { name: "Hatchet", icon: "🪓" },
                { name: "Inferno Staff", icon: "🔥" },
                { name: "Health Potion", icon: "💚" },
                { name: "Haste Boots", icon: "👢" },
              ].map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-1 bg-bazaar-surface/80 border border-bazaar-accent/15 rounded-lg px-2.5 py-1 text-[11px]"
                >
                  <span>{item.icon}</span>
                  <span className="text-bazaar-warm">{item.name}</span>
                </div>
              ))}
            </div>

            {/* Result */}
            <div className="text-center">
              <div className="inline-block bg-bazaar-red/15 border border-bazaar-red/30 text-bazaar-red font-bold px-6 md:px-8 py-3 rounded-xl text-lg md:text-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-bazaar-red/5 via-bazaar-red/10 to-bazaar-red/5 animate-pulse" />
                <span className="relative">ПОРАЖЕНИЕ — Dragon слишком силён!</span>
              </div>
              <p className="text-xs text-bazaar-muted mt-3">
                42 каста &bull; 28.5с боя &bull; Dragon — Legendary Day 8 босс
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-4 py-16">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-bazaar-accent/30" />
          <h2 className="text-2xl md:text-3xl font-bold text-bazaar-warm whitespace-nowrap">
            Как это работает
          </h2>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-bazaar-accent/30" />
        </div>
        <p className="text-center text-bazaar-muted mb-10">
          Три шага до предсказания
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: 1,
              title: "Сделай скриншот",
              desc: "Скриншот PvE-боя из игры или собери билд вручную",
              icon: "📷",
            },
            {
              step: 2,
              title: "Загрузи в Oracle",
              desc: "GPT-4 Vision распознает предметы на обеих досках",
              icon: "🔮",
            },
            {
              step: 3,
              title: "Получи результат",
              desc: "Движок симулирует бой и покажет исход с логом",
              icon: "⚡",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="bg-card-gradient rounded-xl border border-bazaar-accent/15 p-6 text-center hover:border-bazaar-accent/40 hover:shadow-lg hover:shadow-bazaar-purple/10 transition-all group"
            >
              <div className="relative w-14 h-14 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full bg-bazaar-accent/10 group-hover:bg-bazaar-accent/20 transition-colors" />
                <div className="relative w-full h-full flex items-center justify-center text-2xl">
                  {s.icon}
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-bazaar-accent text-bazaar-bg text-xs font-bold flex items-center justify-center">
                  {s.step}
                </div>
              </div>
              <h3 className="text-bazaar-warm font-semibold mb-1 group-hover:text-bazaar-accent transition-colors">{s.title}</h3>
              <p className="text-sm text-bazaar-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="flex items-center justify-center gap-3 mb-2">
          <img
            src="https://playthebazaar.com/images/pagebreak_brown.webp"
            alt=""
            className="w-24 opacity-40 rotate-180"
          />
          <h2 className="text-2xl md:text-3xl font-bold text-bazaar-warm whitespace-nowrap">
            Возможности
          </h2>
          <img
            src="https://playthebazaar.com/images/pagebreak_brown.webp"
            alt=""
            className="w-24 opacity-40"
          />
        </div>
        <p className="text-center text-bazaar-muted mb-10">
          Полный набор инструментов для PvE
        </p>
        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f) => {
            const inner = (
              <>
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-bazaar-warm group-hover:text-bazaar-accent transition-colors">
                  {f.title}
                </h3>
                <p className="text-sm text-bazaar-muted leading-relaxed">
                  {f.desc}
                </p>
                <span className={`inline-block mt-3 text-xs font-medium ${f.external ? "text-[#29B6F6]" : "text-bazaar-accent"}`}>
                  {f.linkLabel}
                </span>
              </>
            );
            const cls = "block bg-card-gradient rounded-xl border border-bazaar-accent/15 p-6 hover:border-bazaar-accent/40 hover:shadow-lg hover:shadow-bazaar-purple/10 transition-all group cursor-pointer";

            return f.external ? (
              <a
                key={f.title}
                href={f.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cls}
              >
                {inner}
              </a>
            ) : (
              <Link key={f.title} href={f.href} className={cls}>
                {inner}
              </Link>
            );
          })}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="max-w-3xl mx-auto px-4 pb-20 text-center">
        <div className="bg-card-gradient rounded-2xl border border-bazaar-accent/20 p-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-bazaar-accent/30 to-transparent" />
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-bazaar-purple/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-bazaar-accent/10 rounded-full blur-3xl" />

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
          <div className="flex gap-4 flex-wrap justify-center">
            <Link
              href="/auth"
              className="bg-gold-gradient hover:brightness-110 text-bazaar-bg font-bold px-10 py-3.5 rounded-xl text-lg transition shadow-lg shadow-bazaar-accent/30 hover:shadow-xl hover:shadow-bazaar-accent/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              Начать бесплатно
            </Link>
            <a
              href="https://t.me/bazaar_oracle_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#29B6F6] hover:bg-[#039BE5] text-white font-bold px-8 py-3.5 rounded-xl text-lg transition shadow-lg shadow-[#29B6F6]/20"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              Telegram-бот
            </a>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-bazaar-accent/10 py-8 text-center text-sm text-bazaar-muted">
        <img
          src="https://playthebazaar.com/images/bazaarLogo_small.webp"
          alt="The Bazaar"
          className="h-6 mx-auto mb-3 opacity-40"
        />
        <div className="flex items-center justify-center gap-4 mb-2">
          <span className="text-bazaar-accent font-medium">The Bazaar Oracle</span>
          <span className="text-bazaar-accent/30">&bull;</span>
          <a
            href="https://t.me/bazaar_oracle_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#29B6F6] hover:text-[#039BE5] transition font-medium"
          >
            @bazaar_oracle_bot
          </a>
        </div>
        Предсказатель PvE-боёв &mdash; Не аффилирован с AVY Entertainment
      </footer>
    </div>
  );
}
