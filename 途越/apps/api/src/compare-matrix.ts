import {
  CarParameterGroup,
  CarParameterGroupLabel,
  CarParameterGroupOrder,
  type CarDetail,
  type CompareParameterGroupDto,
  type CompareMatrixResponse,
  type CompareParameterRow,
} from '@tuyue/contracts';

/**
 * 参数归组兜底表（US-CMP-02）。
 *
 * US-CAR-12 会给参数打上 `group`，但分组字段是新加的、且历史/外部导入的数据未必带，
 * 所以这里保留一层按 code 推断的兜底：有 group 就听 group，没有才推断。
 * 这样对比表不会因为参数分组还没录全而整块塌成「其他」。
 */
const GROUP_KEYWORDS: Array<[CarParameterGroup, string[]]> = [
  [
    CarParameterGroup.POWER,
    [
      'engine',
      'motor',
      'power',
      'torque',
      'acceleration',
      'displacement',
      'transmission',
      'drive',
      'fuel',
      'range',
      'battery',
      'charge',
      'consumption',
    ],
  ],
  [
    CarParameterGroup.SIZE,
    ['length', 'width', 'height', 'wheelbase', 'weight', 'seat', 'trunk', 'volume', 'tire'],
  ],
  [
    CarParameterGroup.SAFETY,
    ['airbag', 'safety', 'abs', 'esp', 'adas', 'brake', 'camera', 'radar', 'childseat'],
  ],
  [
    CarParameterGroup.SMART,
    ['screen', 'smart', 'voice', 'ota', 'navigation', 'hud', 'connect', 'wireless', 'audio'],
  ],
];

export function inferParameterGroup(code: string): CarParameterGroup {
  const normalized = code.toLowerCase();
  for (const [group, keywords] of GROUP_KEYWORDS) {
    if (keywords.some((keyword) => normalized.includes(keyword))) return group;
  }
  return CarParameterGroup.OTHER;
}

interface UnionEntry {
  label: string;
  unit?: string;
  group: CarParameterGroup;
}

function normalizeValue(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * 多车参数并集矩阵。
 *
 * 三条硬规则，缺一条对比表就会「看起来对、实际误导」：
 * 1. 取并集而不是取交集 —— 否则 A 有、B 没有的配置会整行消失，用户以为两车都没这功能；
 * 2. 缺失一律写 `null`，绝不补 `0` 或空字符串 —— 每公里 0 元油费和「没有这项」是两回事；
 * 3. 分组内保持首次出现顺序，分组之间按固定顺序 —— 否则用户每次刷新看到的行序都在跳。
 */
export function buildCompareMatrix(cars: CarDetail[]): CompareMatrixResponse {
  const union = new Map<string, UnionEntry>();

  for (const car of cars) {
    for (const parameter of car.parameters) {
      const existing = union.get(parameter.code);
      if (existing) {
        if (!existing.unit && parameter.unit) existing.unit = parameter.unit;
        continue;
      }
      union.set(parameter.code, {
        label: parameter.label,
        group: parameter.group ?? inferParameterGroup(parameter.code),
        ...(parameter.unit ? { unit: parameter.unit } : {}),
      });
    }
  }

  const rows: CompareParameterRow[] = [];
  for (const [code, entry] of union) {
    const valuesByCarId: Record<string, string | null> = {};
    for (const car of cars) {
      const matched = car.parameters.find((parameter) => parameter.code === code);
      valuesByCarId[car.id] = normalizeValue(matched?.value);
    }
    const distinctValues = new Set(Object.values(valuesByCarId));
    rows.push({
      code,
      label: entry.label,
      valuesByCarId,
      different: distinctValues.size > 1,
      group: entry.group,
      ...(entry.unit ? { unit: entry.unit } : {}),
    });
  }

  const groups: CompareParameterGroupDto[] = [];
  for (const group of CarParameterGroupOrder) {
    const groupRows = rows.filter((row) => row.group === group);
    if (groupRows.length > 0) {
      groups.push({ group, label: CarParameterGroupLabel[group], rows: groupRows });
    }
  }

  let missingCells = 0;
  for (const row of rows) {
    missingCells += Object.values(row.valuesByCarId).filter((value) => value === null).length;
  }

  return {
    carIds: cars.map((car) => car.id),
    columns: cars.map((car) => ({
      carId: car.id,
      name: car.name,
      series: car.series,
      energyType: car.energyType,
      thumbnailUrl: car.thumbnailUrl,
      priceMinCents: car.priceMinCents,
      priceMaxCents: car.priceMaxCents,
    })),
    groups,
    totalRows: rows.length,
    differentRows: rows.filter((row) => row.different).length,
    missingCells,
  };
}
