import { motion } from 'framer-motion';
import { containerVariants, cardVariants } from '../utils/animations';
import EmptyState from './EmptyState';

/**
 * 通用「资源列表」渲染组件，承载三个页面（文件 / 图片 / 剪贴板）重复的
 * grid + 卡片外壳（含入场动画）+ 加载更多 + 空状态逻辑。页面只需渲染卡片主体。
 *
 * @param {Object} props
 * @param {any[]} props.items               当前已加载的条目
 * @param {(item: any) => string} props.getItemKey  条目唯一键
 * @param {(item: any, index: number) => React.ReactNode} props.renderItem
 *        卡片主体渲染函数，返回内容会成为 motion 卡片容器的直接子节点
 *        （Fragments 不产生 DOM 节点，多个兄弟元素可直接包在 Fragment 里）。
 * @param {boolean} [props.hasMore]         是否还有更多
 * @param {boolean} [props.loadingMore]     是否正在加载更多
 * @param {() => void} [props.onLoadMore]   加载更多回调
 * @param {string} [props.emptyIcon]        空状态图标
 * @param {string} [props.emptyTitle]       空状态标题
 * @param {string} [props.emptyDescription] 空状态描述
 * @param {string | ((item: any) => string)} [props.itemClassName]
 *        除 glass-card 外追加在卡片容器上的类名，可为按条目计算的函数
 * @param {(item: any, index: number) => Object} [props.itemMotionProps]
 *        卡片容器的额外 motion 属性（如 onClick / role / tabIndex），默认空对象。
 *        注意：请勿返回 className / key / variants —— 三者由本组件固定管理。
 */
function ResourceGrid({
  items,
  getItemKey,
  renderItem,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  emptyIcon = '📄',
  emptyTitle = '暂无内容',
  emptyDescription = '',
  itemClassName = '',
  itemMotionProps = () => ({}),
}) {
  if (items.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />;
  }

  const resolveClassName = (item) =>
    typeof itemClassName === 'function' ? itemClassName(item) : itemClassName;

  return (
    <>
      <motion.div className="bento-grid" variants={containerVariants} initial="hidden" animate="visible">
        {items.map((item, index) => {
          const extra = resolveClassName(item);
          return (
            <motion.div
              key={getItemKey(item)}
              className={`glass-card${extra ? ` ${extra}` : ''}`}
              variants={cardVariants}
              {...itemMotionProps(item, index)}
            >
              {renderItem(item, index)}
            </motion.div>
          );
        })}
      </motion.div>
      {hasMore && (
        <div className="load-more">
          <button className="btn--text" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? '加载中…' : '加载更多'}
          </button>
        </div>
      )}
    </>
  );
}

export default ResourceGrid;