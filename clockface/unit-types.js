// Shared unit type definitions and display helpers

const UnitTypes = {
  OPTIONS: [
    { value: 'single_room', label: 'Single Room' },
    { value: 'studio', label: 'Studio' },
    { value: 'bedsitter', label: 'Bedsitter' },
    { value: '1br', label: '1BR' },
    { value: '2br', label: '2BR' },
    { value: '3br', label: '3BR' },
    { value: 'shop', label: 'Shop' },
    { value: 'office', label: 'Office' },
    { value: 'other', label: 'Other' },
  ],

  renderSelectOptions(selectedValue = '', includeEmpty = true) {
    const emptyOption = includeEmpty ? '<option value="">Select type</option>' : '';
    const options = this.OPTIONS.map(opt => {
      const selected = selectedValue === opt.value ? 'selected' : '';
      return `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
    }).join('');
    return emptyOption + options;
  },

  formatDisplay(unitType, unitTypeCustom = '') {
    if (unitType === 'other' && unitTypeCustom) {
      return unitTypeCustom;
    }
    const match = this.OPTIONS.find(opt => opt.value === unitType);
    return match ? match.label : (unitType || '');
  },

  isOther(unitType) {
    return unitType === 'other';
  },
};
