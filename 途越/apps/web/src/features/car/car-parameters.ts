import {
  CarParameterGroup,
  CarParameterGroupLabel,
  CarParameterGroupOrder,
  type CarParameter,
} from '@tuyue/contracts';

export interface CarParameterSection {
  group: CarParameterGroup;
  label: string;
  rows: CarParameter[];
}

const KNOWN_GROUPS = new Set<string>(Object.values(CarParameterGroup));

/**
 * 详情页参数分组（US-CAR-02）。
 *
 * 分组顺序固定为「动力 → 尺寸 → 安全 → 智能 → 其他」，和对比表（US-CMP-02）保持一致：
 * 用户在列表、详情、对比三个页面看到的参数顺序应该一样，否则每次换页都要重新找位置。
 * 没有分组（历史数据）或分组值非法的参数归到「其他」，不会被静默丢掉。
 */
export function groupCarParameters(parameters: readonly CarParameter[]): CarParameterSection[] {
  const buckets = new Map<CarParameterGroup, CarParameter[]>();

  for (const parameter of parameters) {
    const raw = parameter.group as string | undefined;
    const group =
      raw && KNOWN_GROUPS.has(raw) ? (raw as CarParameterGroup) : CarParameterGroup.OTHER;
    const rows = buckets.get(group);
    if (rows) rows.push(parameter);
    else buckets.set(group, [parameter]);
  }

  return CarParameterGroupOrder.map((group) => ({
    group,
    label: CarParameterGroupLabel[group],
    rows: buckets.get(group) ?? [],
  })).filter((section) => section.rows.length > 0);
}
