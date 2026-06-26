<script setup>
import ContentNode from './ContentNode.vue'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
})

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
            <ContentNode :nodes="cell.children || []" />
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

.tabular-node__table {
  border-collapse: collapse;
  table-layout: auto;
  color: var(--latex-renderer-text-color);
  line-height: 1.8;
}

.tabular-node__cell {
  border: 0 solid currentcolor;
  padding: 0.12rem 0.55rem;
  white-space: nowrap;
  vertical-align: middle;
}

.tabular-node__cell :deep(.content-node) {
  display: inline;
}
</style>
