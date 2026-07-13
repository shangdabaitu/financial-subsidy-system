// localStorage-based data store - replaces backend API
const Store = {
  KEY: 'subsidy_data',
  LOG_KEY: 'subsidy_logs',
  BATCH_KEY: 'subsidy_batch_logs',

  _getData() {
    const raw = localStorage.getItem(this.KEY);
    return raw ? JSON.parse(raw) : [];
  },

  _saveData(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  _getLogs() {
    const raw = localStorage.getItem(this.LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  _saveLogs(logs) {
    localStorage.setItem(this.LOG_KEY, JSON.stringify(logs));
  },

  _genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  _now() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  },

  _calcDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    if (end < start) return null;
    return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  },

  _calcSubsidy(startDate, endDate, stayCost, bmAmount) {
    const tripDays = this._calcDays(startDate, endDate);
    const subsidyDays = tripDays;
    const stayDays = Math.max(tripDays - 1, 0);
    const tripSubsidy = tripDays * 50;
    const stayRefund = (stayDays * 450 - parseFloat(stayCost)) / 2;
    const total = tripSubsidy + stayRefund + (parseFloat(bmAmount) || 0);

    return {
      trip_days: tripDays,
      subsidy_days: subsidyDays,
      stay_days: stayDays,
      trip_subsidy_amount: parseFloat(tripSubsidy.toFixed(2)),
      stay_refund_amount: parseFloat(stayRefund.toFixed(2)),
      bm_subsidy_amount: parseFloat((parseFloat(bmAmount) || 0).toFixed(2)),
      total_subsidy_amount: parseFloat(total.toFixed(2))
    };
  },

  list(status, page, pageSize) {
    let data = this._getData();
    if (status) {
      data = data.filter(item => item.status === status);
    }
    data.sort((a, b) => b.created_at.localeCompare(a.created_at));

    const total = data.length;
    const start = (page - 1) * pageSize;
    const paged = data.slice(start, start + pageSize);

    return { data: paged, pagination: { page, page_size: pageSize, total } };
  },

  stats() {
    const data = this._getData();
    return {
      total: data.length,
      pending: data.filter(d => d.status === '待核销').length,
      success: data.filter(d => d.status === '核销成功').length,
      failed: data.filter(d => d.status === '核销失败').length
    };
  },

  create(startDate, endDate, stayCost, bmAmount) {
    const calc = this._calcSubsidy(startDate, endDate, stayCost, bmAmount);
    const now = this._now();
    const id = this._genId();

    const record = {
      id,
      trip_start_date: startDate,
      trip_end_date: endDate,
      stay_total_cost: parseFloat(parseFloat(stayCost).toFixed(2)),
      ...calc,
      actual_subsidy_amount: null,
      subsidy_diff_amount: null,
      fail_reason: null,
      status: '待核销',
      created_at: now,
      updated_at: now
    };

    const data = this._getData();
    data.push(record);
    this._saveData(data);

    const logs = this._getLogs();
    logs.push({
      id: this._genId(),
      subsidy_id: id,
      from_status: null,
      to_status: '待核销',
      actual_amount: null,
      diff_amount: null,
      fail_reason: null,
      operated_at: now
    });
    this._saveLogs(logs);

    return record;
  },

  writeOff(id, actualAmount, failReason) {
    const data = this._getData();
    const item = data.find(d => d.id === id);
    if (!item) throw new Error('记录不存在');
    if (item.status === '核销成功') throw new Error('核销成功状态不可再次核销');

    const total = item.total_subsidy_amount;
    const diff = parseFloat((total - parseFloat(actualAmount)).toFixed(2));
    const newStatus = Math.abs(diff) < 5 ? '核销成功' : '核销失败';
    const now = this._now();

    item.actual_subsidy_amount = parseFloat(parseFloat(actualAmount).toFixed(2));
    item.subsidy_diff_amount = diff;
    item.fail_reason = failReason || null;
    item.status = newStatus;
    item.updated_at = now;

    this._saveData(data);

    const logs = this._getLogs();
    logs.push({
      id: this._genId(),
      subsidy_id: id,
      from_status: item.status,
      to_status: newStatus,
      actual_amount: item.actual_subsidy_amount,
      diff_amount: diff,
      fail_reason: failReason || null,
      operated_at: now
    });
    this._saveLogs(logs);

    return item;
  },

  getDetail(id) {
    const data = this._getData();
    const item = data.find(d => d.id === id);
    if (!item) throw new Error('记录不存在');

    const logs = this._getLogs()
      .filter(l => l.subsidy_id === id)
      .sort((a, b) => b.operated_at.localeCompare(a.operated_at));

    return { ...item, logs };
  },

  _getBatchLogs() {
    const raw = localStorage.getItem(this.BATCH_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  _saveBatchLogs(logs) {
    localStorage.setItem(this.BATCH_KEY, JSON.stringify(logs));
  },

  listPendingForBatch() {
    const data = this._getData();
    return data
      .filter(d => d.status === '待核销' || d.status === '核销失败')
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  batchWriteOff(ids, totalActualAmount) {
    const data = this._getData();
    const now = this._now();
    const selectedItems = data.filter(d => ids.includes(d.id));

    if (selectedItems.length === 0) throw new Error('请至少选择一条记录');

    const totalSubsidySum = selectedItems.reduce((sum, item) => sum + item.total_subsidy_amount, 0);
    const diff = parseFloat((totalActualAmount - totalSubsidySum).toFixed(2));
    const newStatus = Math.abs(diff) <= 5 ? '核销成功' : '核销失败';

    const batchLogId = this._genId();
    const batchItems = [];

    selectedItems.forEach(item => {
      const actualAmount = parseFloat((totalActualAmount * item.total_subsidy_amount / totalSubsidySum).toFixed(2));
      const itemDiff = parseFloat((item.total_subsidy_amount - actualAmount).toFixed(2));

      const oldStatus = item.status;
      item.actual_subsidy_amount = actualAmount;
      item.subsidy_diff_amount = itemDiff;
      item.status = newStatus;
      item.updated_at = now;

      const logs = this._getLogs();
      logs.push({
        id: this._genId(),
        subsidy_id: item.id,
        from_status: oldStatus,
        to_status: newStatus,
        actual_amount: actualAmount,
        diff_amount: itemDiff,
        fail_reason: null,
        operated_at: now
      });
      this._saveLogs(logs);

      batchItems.push({
        subsidy_id: item.id,
        trip_start_date: item.trip_start_date,
        trip_end_date: item.trip_end_date,
        total_subsidy_amount: item.total_subsidy_amount,
        actual_subsidy_amount: actualAmount,
        diff_amount: itemDiff
      });
    });

    this._saveData(data);

    const batchLogs = this._getBatchLogs();
    batchLogs.push({
      id: batchLogId,
      operated_at: now,
      record_count: selectedItems.length,
      total_actual_amount: parseFloat(parseFloat(totalActualAmount).toFixed(2)),
      total_subsidy_amount: parseFloat(totalSubsidySum.toFixed(2)),
      diff_amount: diff,
      result: newStatus,
      items: batchItems
    });
    this._saveBatchLogs(batchLogs);

    return { newStatus, diff, totalSubsidySum, count: selectedItems.length };
  },

  listBatchLogs() {
    const logs = this._getBatchLogs();
    return logs.sort((a, b) => b.operated_at.localeCompare(a.operated_at));
  },

  delete(id) {
    const data = this._getData();
    const item = data.find(d => d.id === id);
    if (!item) throw new Error('记录不存在');

    const newData = data.filter(d => d.id !== id);
    this._saveData(newData);

    const logs = this._getLogs().filter(l => l.subsidy_id !== id);
    this._saveLogs(logs);

    return item;
  }
};
