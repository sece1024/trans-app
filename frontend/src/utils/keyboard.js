/**
 * 判断键盘事件是否直接落在绑定元素本身，而不是从卡片内部的按钮冒泡上来。
 *
 * 剪贴板/图片卡片的容器带 role="button" 与 Enter/Space 快捷键；
 * 若不判断 target，焦点在「删除 / 改分类」按钮上按 Enter 会同时触发
 * 卡片复制或图片预览，形成一次按键两个动作。
 *
 * @param {{ target: EventTarget|null, currentTarget: EventTarget|null }} event
 * @returns {boolean}
 */
export function isSelfKeyboardEvent(event) {
  return event.target === event.currentTarget;
}
