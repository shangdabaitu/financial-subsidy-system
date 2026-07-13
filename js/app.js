let currentPage = 1;
let currentPageSize = 20;
let currentStatus = '';
let currentData = [];

const statusMap = {
  '待核销': { class: 'status-pending', text: '待核销' },
  '核销成功': { class: 'status-success', text: '核销成功' },
  '核销失败': { class: 'status-failed', text: '核销失败' }
};

// Utility functions
function formatMoney(value) {
  const num = parseFloat(value) || 0;
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateTime(datetime) {
  if (!datetime) return '-';
  return datetime;
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 2500);
}

function showEmpty(show) {
  document.getElementById('empty').style.display = show ? 'block' : 'none';
}

function showContent(show) {
  document.getElementById('table-container').style.display = show ? 'block' : 'none';
  document.getElementById('card-list').style.display = show ? 'block' : 'none';
}

function loadStats() {
  const stats = Store.stats();
  document.getElementById('stat-total').textContent = stats.total;
  document.getElementById('stat-pending').textContent = stats.pending;
  document.getElementById('stat-success').textContent = stats.success;
  document.getElementById('stat-failed').textContent = stats.failed;

  document.getElementById('badge-total').textContent = stats.total;
  document.getElementById('badge-pending').textContent = stats.pending;
  document.getElementById('badge-success').textContent = stats.success;
  document.getElementById('badge-failed').textContent = stats.failed;
}

function loadList() {
  showEmpty(false);
  showContent(false);
  document.getElementById('pagination').innerHTML = '';

  const result = Store.list(currentStatus, currentPage, currentPageSize);
  currentData = result.data || [];
  const pagination = result.pagination || { page: 1, page_size: 20, total: 0 };

  if (currentData.length === 0) {
    showEmpty(true);
    showContent(false);
  } else {
    showEmpty(false);
    showContent(true);
    renderTable(currentData, pagination);
    renderCards(currentData);
    renderPagination(pagination);
  }
}

function renderTable(data, pagination) {
  const tbody = document.getElementById('table-body');
  const startIndex = (pagination.page - 1) * pagination.page_size;

  tbody.innerHTML = data.map((item, index) => {
    const status = statusMap[item.status] || statusMap['待核销'];
    const negativeClass = item.stay_refund_amount < 0 ? 'negative' : '';
    const buttons = renderActionButtons(item);

    return `
      <tr>
        <td>${startIndex + index + 1}</td>
        <td>${item.trip_start_date}</td>
        <td>${item.trip_end_date}</td>
        <td>${item.trip_days}</td>
        <td>${item.subsidy_days}</td>
        <td>${item.stay_days}</td>
        <td>${formatMoney(item.stay_total_cost)}</td>
        <td>${formatMoney(item.trip_subsidy_amount)}</td>
        <td class="${negativeClass}">${formatMoney(item.stay_refund_amount)}</td>
        <td>${formatMoney(item.bm_subsidy_amount)}</td>
        <td>${formatMoney(item.total_subsidy_amount)}</td>
        <td><span class="status-tag ${status.class}">${status.text}</span></td>
        <td>${buttons}</td>
      </tr>
    `;
  }).join('');
}

function renderCards(data) {
  const container = document.getElementById('card-list');

  container.innerHTML = data.map(item => {
    const status = statusMap[item.status] || statusMap['待核销'];
    const negativeClass = item.stay_refund_amount < 0 ? 'negative' : '';
    const buttons = renderActionButtons(item, true);

    return `
      <div class="card-item">
        <div class="card-header">
          <span class="card-title">${item.trip_start_date} ~ ${item.trip_end_date}</span>
          <span class="status-tag ${status.class}">${status.text}</span>
        </div>
        <div class="card-row"><span class="label">出差天数</span><span class="value">${item.trip_days} 天</span></div>
        <div class="card-row"><span class="label">应补助天数</span><span class="value">${item.subsidy_days} 天</span></div>
        <div class="card-row"><span class="label">住宿天数</span><span class="value">${item.stay_days} 天</span></div>
        <div class="card-row"><span class="label">住宿总花费</span><span class="value">${formatMoney(item.stay_total_cost)}</span></div>
        <div class="card-row"><span class="label">出差天数应补助金额</span><span class="value">${formatMoney(item.trip_subsidy_amount)}</span></div>
        <div class="card-row"><span class="label">住宿应返还金额</span><span class="value ${negativeClass}">${formatMoney(item.stay_refund_amount)}</span></div>
        <div class="card-row"><span class="label">bm 补助金额</span><span class="value">${formatMoney(item.bm_subsidy_amount)}</span></div>
        <div class="card-row"><span class="label">总应补助金额</span><span class="value">${formatMoney(item.total_subsidy_amount)}</span></div>
        <div class="card-actions">${buttons}</div>
      </div>
    `;
  }).join('');
}

function renderActionButtons(item, fullWidth = false) {
  const style = fullWidth ? 'style="flex:1"' : '';

  if (item.status === '待核销') {
    return `<button class="btn btn-primary btn-sm" ${style} onclick="openWriteOff('${item.id}')">核销</button>`;
  } else if (item.status === '核销失败') {
    return `
      <button class="btn btn-primary btn-sm" ${style} onclick="openWriteOff('${item.id}')">核销</button>
      <button class="btn btn-secondary btn-sm" ${style} onclick="openDetail('${item.id}')">详情</button>
    `;
  } else {
    return `<button class="btn btn-secondary btn-sm" ${style} onclick="openDetail('${item.id}')">详情</button>`;
  }
}

function renderPagination(pagination) {
  const totalPages = Math.ceil(pagination.total / pagination.page_size) || 1;
  const container = document.getElementById('pagination');

  let pagesHtml = '';
  for (let i = 1; i <= totalPages; i++) {
    pagesHtml += `<button class="page-btn ${i === pagination.page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }

  container.innerHTML = `
    <span class="pagination-info">共 ${pagination.total} 条</span>
    <select class="page-size" onchange="changePageSize(this.value)">
      <option value="20" ${pagination.page_size === 20 ? 'selected' : ''}>20/页</option>
      <option value="50" ${pagination.page_size === 50 ? 'selected' : ''}>50/页</option>
    </select>
    <button class="page-btn" onclick="goToPage(${pagination.page - 1})" ${pagination.page === 1 ? 'disabled' : ''}>上一页</button>
    ${pagesHtml}
    <button class="page-btn" onclick="goToPage(${pagination.page + 1})" ${pagination.page === totalPages ? 'disabled' : ''}>下一页</button>
  `;
}

function goToPage(page) {
  currentPage = page;
  loadList();
}

function changePageSize(size) {
  currentPageSize = parseInt(size);
  currentPage = 1;
  loadList();
}

// Modal functions
function openModal(id) {
  document.getElementById(id).style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
  document.body.style.overflow = '';
}

// Add form calculations
function calcDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  if (end < start) return null;
  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

function updateAddCalculations() {
  const form = document.getElementById('form-add');
  const startDate = form.trip_start_date.value;
  const endDate = form.trip_end_date.value;
  const stayCost = parseFloat(form.stay_total_cost.value) || 0;
  const bmAmount = parseFloat(form.bm_subsidy_amount.value) || 0;

  if (!startDate || !endDate) {
    form.trip_days.value = '';
    form.subsidy_days.value = '';
    form.stay_days.value = '';
    form.trip_subsidy_amount.value = '';
    form.stay_refund_amount.value = '';
    form.total_subsidy_amount.value = '';
    return;
  }

  const tripDays = calcDays(startDate, endDate);
  if (tripDays === null) {
    form.trip_days.value = '';
    form.subsidy_days.value = '';
    form.stay_days.value = '';
    return;
  }

  const subsidyDays = tripDays;
  const stayDays = Math.max(tripDays - 1, 0);
  const tripSubsidy = tripDays * 50;
  const stayRefund = (stayDays * 450 - stayCost) / 2;
  const total = tripSubsidy + stayRefund + bmAmount;

  form.trip_days.value = tripDays;
  form.subsidy_days.value = subsidyDays;
  form.stay_days.value = stayDays;
  form.trip_subsidy_amount.value = formatMoney(tripSubsidy);
  form.stay_refund_amount.value = formatMoney(stayRefund);
  form.total_subsidy_amount.value = formatMoney(total);
}

function resetAddForm() {
  document.getElementById('form-add').reset();
  updateAddCalculations();
}

function saveAdd() {
  const form = document.getElementById('form-add');
  const startDate = form.trip_start_date.value;
  const endDate = form.trip_end_date.value;
  const stayCost = form.stay_total_cost.value;
  const bmAmount = form.bm_subsidy_amount.value;

  if (!startDate || !endDate || stayCost === '') {
    showToast('请填写必填项', 'error');
    return;
  }

  if (new Date(endDate) < new Date(startDate)) {
    showToast('出差结束日期不能早于开始日期', 'error');
    return;
  }

  try {
    Store.create(startDate, endDate, parseFloat(stayCost), parseFloat(bmAmount) || 0);
    showToast('新增成功');
    closeModal('modal-add');
    resetAddForm();
    loadStats();
    loadList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Write-off functions
function openWriteOff(id) {
  const item = currentData.find(d => d.id === id);
  if (!item) return;

  const form = document.getElementById('form-writeoff');
  form.id.value = item.id;
  form.total_subsidy_amount.value = formatMoney(item.total_subsidy_amount);
  form.actual_subsidy_amount.value = '';
  form.subsidy_diff_amount.value = '';
  form.fail_reason.value = '';

  openModal('modal-writeoff');
}

function updateWriteOffCalculations() {
  const form = document.getElementById('form-writeoff');
  const total = parseFloat(form.total_subsidy_amount.value.replace(/,/g, '')) || 0;
  const actual = parseFloat(form.actual_subsidy_amount.value) || 0;
  const diff = total - actual;
  form.subsidy_diff_amount.value = formatMoney(diff);
}

function saveWriteOff() {
  const form = document.getElementById('form-writeoff');
  const id = form.id.value;
  const actualAmount = form.actual_subsidy_amount.value;

  if (actualAmount === '') {
    showToast('请输入实际补助金额', 'error');
    return;
  }

  try {
    Store.writeOff(id, parseFloat(actualAmount), form.fail_reason.value);
    showToast('核销成功');
    closeModal('modal-writeoff');
    loadStats();
    loadList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Detail functions
function openDetail(id) {
  try {
    const item = Store.getDetail(id);
    const logs = item.logs || [];
    const status = statusMap[item.status] || statusMap['待核销'];

    const negativeClass = item.stay_refund_amount < 0 ? 'negative' : '';

    const logsHtml = logs.map(log => {
      const fromText = log.from_status ? `${log.from_status} → ` : '';
      return `
        <div class="log-item">
          <span class="log-status">${fromText}${log.to_status}</span>
          <span class="log-time">${formatDateTime(log.operated_at)}</span>
        </div>
      `;
    }).join('');

    document.getElementById('detail-body').innerHTML = `
      <div class="detail-section">
        <div class="detail-section-title">基本信息</div>
        <div class="detail-row"><span class="label">出差开始日期</span><span class="value">${item.trip_start_date}</span></div>
        <div class="detail-row"><span class="label">出差结束日期</span><span class="value">${item.trip_end_date}</span></div>
        <div class="detail-row"><span class="label">出差天数</span><span class="value">${item.trip_days}</span></div>
        <div class="detail-row"><span class="label">应补助天数</span><span class="value">${item.subsidy_days}</span></div>
        <div class="detail-row"><span class="label">住宿天数</span><span class="value">${item.stay_days}</span></div>
        <div class="detail-row"><span class="label">住宿总花费</span><span class="value">${formatMoney(item.stay_total_cost)}</span></div>
        <div class="detail-row"><span class="label">出差天数应补助金额</span><span class="value">${formatMoney(item.trip_subsidy_amount)}</span></div>
        <div class="detail-row"><span class="label">住宿应返还金额</span><span class="value ${negativeClass}">${formatMoney(item.stay_refund_amount)}</span></div>
        <div class="detail-row"><span class="label">bm 补助金额</span><span class="value">${formatMoney(item.bm_subsidy_amount)}</span></div>
        <div class="detail-row"><span class="label">总应补助金额</span><span class="value">${formatMoney(item.total_subsidy_amount)}</span></div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">核销信息</div>
        <div class="detail-row"><span class="label">核销状态</span><span class="value"><span class="status-tag ${status.class}">${status.text}</span></span></div>
        <div class="detail-row"><span class="label">实际补助金额</span><span class="value">${item.actual_subsidy_amount !== null ? formatMoney(item.actual_subsidy_amount) : '-'}</span></div>
        <div class="detail-row"><span class="label">补助差额</span><span class="value">${item.subsidy_diff_amount !== null ? formatMoney(item.subsidy_diff_amount) : '-'}</span></div>
        <div class="detail-row"><span class="label">失败原因</span><span class="value">${item.fail_reason || '-'}</span></div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">操作日志</div>
        <div class="log-list">
          ${logsHtml || '<div class="log-item"><span>暂无操作记录</span></div>'}
        </div>
      </div>
    `;

    openModal('modal-detail');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadList();

  document.getElementById('btn-add').addEventListener('click', () => {
    resetAddForm();
    openModal('modal-add');
  });

  document.querySelectorAll('.status-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.status-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentStatus = tab.dataset.status;
      currentPage = 1;
      loadList();
    });
  });

  document.getElementById('form-add').addEventListener('input', (e) => {
    if (['trip_start_date', 'trip_end_date', 'stay_total_cost', 'bm_subsidy_amount'].includes(e.target.name)) {
      updateAddCalculations();
    }
  });

  document.getElementById('form-writeoff').addEventListener('input', (e) => {
    if (e.target.name === 'actual_subsidy_amount') {
      updateWriteOffCalculations();
    }
  });

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (modal) closeModal(modal.id);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', () => {
      const modal = overlay.closest('.modal');
      if (modal) closeModal(modal.id);
    });
  });

  document.getElementById('btn-save-add').addEventListener('click', saveAdd);
  document.getElementById('btn-save-writeoff').addEventListener('click', saveWriteOff);
});
