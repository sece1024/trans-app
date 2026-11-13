import { MAX_CATEGORY_LENGTH } from '../utils/uploadLimits';
import { normalizeCategoryInput, sameCategory } from '../utils/clipboardCategories';

/**
 * 分类输入框 + 已有分类快捷选择行。
 *
 * 这里刻意不用 `<datalist>`：iOS Safari 完全不支持 datalist 下拉，
 * 手机用户既看不到已有分类也无法从列表中选取（只能手打），
 * Android 上触屏操作原生下拉也不如一行 chip 直观。
 * 因此改为「输入框 + 可点选的分类 chip 行」，两种设备行为一致。
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
 * @param {boolean} [props.compact]          紧凑模式（卡片内联编辑用）
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
  compact = false,
}) {
  const normalized = normalizeCategoryInput(value);
  // 分类身份忽略大小写（与后端一致）：输入 link 时已有的 Link chip 也是选中态
  const isAutoDetected = Boolean(autoDetected) && sameCategory(normalized, autoDetected);
  const chips = suggestions.filter((category) => category?.name);

  return (
    <div className={`category-field${compact ? ' category-field--compact' : ''}`}>
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
      </div>

      {chips.length > 0 && (
        <div className="category-suggestions" role="group" aria-label="选择已有分类">
          {chips.map(({ name, count }) => {
            const selected = sameCategory(normalized, name);
            return (
              <button
                key={name}
                className={`category-suggestion${selected ? ' is-selected' : ''}`}
                aria-pressed={selected}
                aria-label={selected ? `取消分类 ${name}` : `设为分类 ${name}`}
                // 再点一次已选中的分类即取消，等价于清空分类
                onClick={() => onChange(selected ? '' : name)}
              >
                {name}
                {typeof count === 'number' && (
                  <span className="category-suggestion-count">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CategoryField;
