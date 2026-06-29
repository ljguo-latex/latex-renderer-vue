<script setup>
import ContentNode from './ContentNode.vue'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  editable: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update-node'])

function cellStyle(column, row, cellIndex) {
  return {
    textAlign: column?.align || 'left',
    borderLeftWidth: column?.leftBorder ? '1px' : '0',
    borderRightWidth: column?.rightBorder ? '1px' : '0',
    borderTopWidth: row.topBorder ? '1px' : '0',
    borderBottomWidth: row.bottomBorder ? '1px' : '0',
  }
}
</script>

<template>
  <div class="tabular-node">
    <table class="tabular-node__table">
      <tbody>
        <tr v-for="row in node.rows || []" :key="row.id">
          <td
            v-for="(cell, cellIndex) in row.cells"
            :key="cell.id"
            class="tabular-node__cell"
            :style="cellStyle(node.columns?.[cellIndex], row, cellIndex)"
          >
            <ContentNode :nodes="cell.children || []" :editable="editable" @update-node="emit('update-node', $event)" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.tabular-node {
  display: inline-block;
  max-width: 100%;
  overflow-x: auto;
  vertical-align: middle;
}

/* 优雅的滚动条 */
.tabular-node::-webkit-scrollbar {
  height: 6px;
}
.tabular-node::-webkit-scrollbar-track {
  background: transparent;
}
.tabular-node::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--latex-renderer-text-color) 15%, transparent);
  border-radius: 3px;
}
.tabular-node::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--latex-renderer-text-color) 30%, transparent);
}

.tabular-node__table {
  border-collapse: collapse;
  table-layout: auto;
  color: var(--latex-renderer-text-color);
  line-height: 1.8;
}

/* 表格行悬浮交互效果 */
.tabular-node__table tr {
  transition: background-color 0.2s ease;
}
.tabular-node__table tr:hover {
  background-color: color-mix(in srgb, var(--latex-renderer-theme-color) 6%, transparent);
}

.tabular-node__cell {
  /* 柔和的边框颜色 */
  border: 0 solid color-mix(in srgb, var(--latex-renderer-text-color) 35%, transparent);
  /* 增加内边距让表格更舒展 */
  padding: 0.35rem 0.75rem;
  white-space: nowrap;
  vertical-align: middle;
}

.tabular-node__cell :deep(.content-node) {
  display: inline;
}
</style>
