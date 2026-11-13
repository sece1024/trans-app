import { useRef } from 'react';
import { MAX_CATEGORY_LENGTH } from '../utils/uploadLimits';
import { buildCategoryOptions } from '../utils/clipboardCategories';

/**
 * 分类输入框 + 已有分类快捷选择行。
 *
 * 这里刻意不用 `<datalist>`：iOS Safari 完全不支持 datalist 下拉，
 * 手机用户既看不到已有分类也无法从列表中选取（只能手打），
 * Android 上触屏操作原生下拉也不如一行 chip 直观。
 * 因此改为「输入框 + 可点选的分类 chip 行」，两种设备行为一致。
 *
 * chip 的排序/截断/「将新建」判定全部下沉到 `buildCategoryOptions`（纯函数、可单测），
 * 本组件只负责交互与可访问性：点击选中、再点取消、方向键在 chip 间移动焦点。
 *
 * @param {Object} props
 * @param {string} props.value                当前分类输入值
 * @param {(value: string) => void} props.onChange 用户修改分类（点击 chip 也会触发）
 * @param {{name: string, count?: number}[]} [props.suggestions] 已有分类（点击即填入）
 * @param {string} [props.autoDetected]       根据内容自动识别出的分类名，用于展示提示
 * @param {() => void} [props.onSubmit]       输入框回车回调（如提交分享 / 保存分类）
 * @param {() => void} [props.onCancel]       输入框 Esc 回调
 * @param {boolean} [props.autoFocus]
 * @param {string} [props.placeholder]
 * @param {string} [props.ariaLabel]
 * @param {'form'|'inline'|'manage'} [props.variant='form']
 *        使用场景而不是一堆布尔开关：`form` = 分享表单（默认），
 *        `inline` = 卡片内联编辑，`manage` = 分类管理弹层里重命名（此时不提示「新建分类」）
 */
function CategoryField({
  value,
  onChange,
  suggestions = [],
  autoDetected = '',
  onSubmit,
  onCancel,
  autoFocus = false,
  placeholder = '分类（可选）',
  ariaLabel = '分类',
  variant = 'form',
}) {
  const chipsRef = useRef(null);
  const isCompact = variant !== 'form';
  const { query, options, isNew, hiddenCount, overflow } = buildCategoryOptions({
    suggestions,
    value,
    // 紧凑场景（卡片内联 / 管理弹层）空间更小，少放几个 chip
    maxItems: isCompact ? 6 : 8,
  });
  // 管理弹层里改的是「分类本身的名字」，提示「将新建分类」会误导
  const showNewHint = isNew && variant !== 'manage';
  const normalized = query;
  const isAutoDetected =
    Boolean(autoDetected) && normalized.toLowerCase() === autoDetected.toLowerCase();

  // 方向键在 chip 之间移动焦点（Tab 会经过每个 chip，但一长排 chip 用方向键更自然）
  const handleChipsKeyDown = (event) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    const buttons = Array.from(chipsRef.current?.querySelectorAll('[data-category-chip]') ?? []);
    if (buttons.length === 0) return;

    const current = buttons.indexOf(document.activeElement);
    if (event.key === 'Home') {
      event.preventDefault();
      buttons[0].focus();
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      buttons[buttons.length - 1].focus();
      return;
    }
    // 没有焦点在 chip 上时，从第一个开始
    if (current === -1) {
      event.preventDefault();
      buttons[0].focus();
      return;
    }
    const offset = event.key === 'ArrowRight' ? 1 : -1;
    const next = (current + offset + buttons.length) % buttons.length;
    event.preventDefault();
    buttons[next].focus();
  };

  return (
    <div className={`category-field${isCompact ? ' category-field--compact' : ''}`}>
      <div className="category-field-row">
        <input
          className="category-input"
          value={value}
          maxLength={MAX_CATEGORY_LENGTH}
          placeholder={placeholder}
          aria-label={ariaLabel}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit?.();
            }
            if (e.key === 'Escape') onCancel?.();
          }}
        />
        {isAutoDetected && (
          <span className="category-hint" title="根据内容自动识别，可修改或清空">
            自动识别
          </span>
        )}
        {overflow && (
          <span className="category-hint category-hint--warn" role="status">
            已达 {MAX_CATEGORY_LENGTH} 字上限
          </span>
        )}
      </div>

      {options.length > 0 && (
        <div
          ref={chipsRef}
          className="category-suggestions"
          role="group"
          aria-label="选择已有分类"
          onKeyDown={handleChipsKeyDown}
        >
          {options.map(({ name, count, selected }) => (
            <button
              key={name}
              type="button"
              data-category-chip=""
              className={`category-suggestion${selected ? ' is-selected' : ''}`}
              aria-pressed={selected}
              // 已选中时再点一次 = 取消分类，这个隐式约定用 title 说明
              title={selected ? '再点一次取消选择' : undefined}
              aria-label={selected ? `取消分类 ${name}` : `设为分类 ${name}`}
              onClick={() => onChange(selected ? '' : name)}
            >
              {name}
              {typeof count === 'number' && (
                <span className="category-suggestion-count">{count}</span>
              )}
            </button>
          ))}
          {hiddenCount > 0 && (
            <span className="category-hint">还有 {hiddenCount} 个，输入可筛选</span>
          )}
        </div>
      )}

      {/* 显式告知「这个输入会新建分类」：过去用户不知道可以直接打字创建 */}
      {showNewHint && (
        <span className="category-new-hint" role="status">
          ＋ 将新建分类「{query}」
        </span>
      )}
    </div>
  );
}

export default CategoryField;
