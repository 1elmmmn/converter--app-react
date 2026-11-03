interface Props {
  onToggleTheme: () => void;
}

export function Header({ onToggleTheme }: Props) {
  return (
    <header className="top">
      <a className="wordmark" href="./">
        Курс
      </a>
      <button type="button" className="icon-btn" aria-label="Переключить тему оформления" onClick={onToggleTheme}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" />
        </svg>
      </button>
    </header>
  );
}
