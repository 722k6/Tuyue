import { CarParameterGroup, type CarParameter } from '@tuyue/contracts';
import { describe, expect, it } from 'vitest';
import { groupCarParameters } from '../src/features/car/car-parameters';

const parameters: CarParameter[] = [
  { code: 'ota', label: '整车 OTA', value: '支持', group: CarParameterGroup.SMART },
  { code: 'power', label: '最大功率', value: '185', unit: 'kW', group: CarParameterGroup.POWER },
  { code: 'legacy', label: '未分组参数', value: '—' },
  { code: 'airbags', label: '安全气囊', value: '6', unit: '个', group: CarParameterGroup.SAFETY },
];

describe('详情页参数分组', () => {
  it('按固定顺序排列分组，空分组不渲染', () => {
    const sections = groupCarParameters(parameters);

    expect(sections.map((section) => section.group)).toEqual([
      CarParameterGroup.POWER,
      CarParameterGroup.SAFETY,
      CarParameterGroup.SMART,
      CarParameterGroup.OTHER,
    ]);
    expect(sections.map((section) => section.label)).toEqual(['动力', '安全', '智能', '其他']);
    expect(sections.some((section) => section.group === CarParameterGroup.SIZE)).toBe(false);
  });

  it('没有分组的参数归入「其他」，不被丢掉', () => {
    const other = groupCarParameters(parameters).find(
      (section) => section.group === CarParameterGroup.OTHER,
    );

    expect(other?.rows.map((row) => row.code)).toEqual(['legacy']);
  });

  it('分组值非法时同样落到「其他」，保持参数不丢', () => {
    const dirty = [
      { code: 'x', label: '异常分组', value: '1', group: 'unknown' as CarParameterGroup },
    ];
    const sections = groupCarParameters(dirty);

    expect(sections).toHaveLength(1);
    expect(sections[0]?.group).toBe(CarParameterGroup.OTHER);
    expect(sections[0]?.rows[0]?.code).toBe('x');
  });

  it('空参数列表返回空分组，交给页面渲染空态', () => {
    expect(groupCarParameters([])).toEqual([]);
  });
});
