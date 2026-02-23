const REBAR_TABLE = {
  '#3': { area: 0.11, diameter: 0.375 },
  '#4': { area: 0.2, diameter: 0.5 },
  '#5': { area: 0.31, diameter: 0.625 },
  '#6': { area: 0.44, diameter: 0.75 },
  '#7': { area: 0.6, diameter: 0.875 },
  '#8': { area: 0.79, diameter: 1.0 },
  '#9': { area: 1.0, diameter: 1.128 },
  '#10': { area: 1.27, diameter: 1.27 },
  '#11': { area: 1.56, diameter: 1.41 },
};

const EPSILON = 1e-9;

function rectangleIxx(width, height) {
  return (width * height ** 3) / 12;
}

function safeDivide(numerator, denominator) {
  return Math.abs(denominator) < EPSILON ? null : numerator / denominator;
}

function computeBarLayer(matInput, concreteBottomY, concreteTopY, isTopMat) {
  const primary = REBAR_TABLE[matInput.barSize];
  const spacing = Number(matInput.spacing);
  const clearDistance = Number(matInput.clearDistance);

  if (!primary || spacing <= 0 || clearDistance < 0) {
    return {
      areaPerInch: 0,
      yCentroid: concreteBottomY,
      detail: 'Mat omitted due to incomplete inputs.',
      assumption: null,
    };
  }

  let areaPerInch = primary.area / spacing;
  let diameter = primary.diameter;
  let assumption = null;

  if (matInput.alternatingBars) {
    const secondary = REBAR_TABLE[matInput.altBarSize];
    const altSpacing = Number(matInput.altSpacing);

    if (secondary && altSpacing > 0) {
      areaPerInch = 0.5 * ((primary.area / spacing) + (secondary.area / altSpacing));
      diameter = 0.5 * (primary.diameter + secondary.diameter);
      assumption =
        'Alternating bars transformed with As/in = 0.5 * (A1/s1 + A2/s2).';
    }
  }

  const radius = diameter / 2;
  const yCentroid = isTopMat
    ? concreteTopY - (clearDistance + radius)
    : concreteBottomY + clearDistance + radius;

  return {
    areaPerInch,
    yCentroid,
    detail: `${matInput.barSize}${matInput.alternatingBars ? ` alternating ${matInput.altBarSize}` : ''}`,
    assumption,
  };
}

function buildSteelComponents(region) {
  const webHeight = Math.max(region.D - region.tfTop - region.tfBot, 0);

  return [
    {
      name: 'Bottom flange',
      area: region.bfBot * region.tfBot,
      y: region.tfBot / 2,
      iLocal: rectangleIxx(region.bfBot, region.tfBot),
    },
    {
      name: 'Web',
      area: region.tw * webHeight,
      y: region.tfBot + webHeight / 2,
      iLocal: rectangleIxx(region.tw, webHeight),
    },
    {
      name: 'Top flange',
      area: region.bfTop * region.tfTop,
      y: region.D - region.tfTop / 2,
      iLocal: rectangleIxx(region.bfTop, region.tfTop),
    },
  ];
}

function summarizeSection(components, referenceFibers) {
  const totalArea = components.reduce((sum, component) => sum + component.area, 0);
  const yBar =
    components.reduce((sum, component) => sum + (component.area * component.y), 0) /
    Math.max(totalArea, EPSILON);

  const i = components.reduce((sum, component) => {
    const d = component.y - yBar;
    return sum + component.iLocal + (component.area * d ** 2);
  }, 0);

  const sectionModulus = {};
  Object.entries(referenceFibers).forEach(([key, fiberY]) => {
    const c = Math.abs(fiberY - yBar);
    sectionModulus[key] = safeDivide(i, c);
  });

  return {
    totalArea,
    yBar,
    i,
    sectionModulus,
  };
}

function computeCompositeUncracked(region, transformedConcreteFactor, bars, label) {
  const concreteDepth = region.tHaunch + region.tSlab;
  const concreteBottomY = region.D;
  const concreteTopY = region.D + concreteDepth;
  const concreteArea = region.bEff * concreteDepth;

  const components = [
    ...buildSteelComponents(region),
    {
      name: `Concrete (${label})`,
      area: concreteArea / transformedConcreteFactor,
      y: concreteBottomY + concreteDepth / 2,
      iLocal: rectangleIxx(region.bEff, concreteDepth) / transformedConcreteFactor,
    },
    {
      name: 'Top reinforcement',
      area: bars.top.areaPerInch * region.bEff,
      y: bars.top.yCentroid,
      iLocal: 0,
    },
    {
      name: 'Bottom reinforcement',
      area: bars.bottom.areaPerInch * region.bEff,
      y: bars.bottom.yCentroid,
      iLocal: 0,
    },
  ];

  const summary = summarizeSection(components, {
    topOfSlab: concreteTopY,
    topOfSteel: region.D,
    bottomOfSteel: 0,
  });

  return {
    ...summary,
    components,
    concreteDepth,
    concreteTopY,
    concreteBottomY,
  };
}

function solveCrackedNeutralAxis(region, modularRatio, steelComponents, rebarComponents) {
  const concreteTop = region.D + region.tHaunch + region.tSlab;
  const concreteBottom = region.D;

  const forceBalance = (na) => {
    const steelMoment = [...steelComponents, ...rebarComponents].reduce(
      (sum, component) => sum + (component.area * (component.y - na)),
      0,
    );

    if (na >= concreteTop) {
      return steelMoment;
    }

    const compressionBottom = Math.max(na, concreteBottom);
    const compressionDepth = concreteTop - compressionBottom;

    if (compressionDepth <= 0) {
      return steelMoment;
    }

    const area = (region.bEff * compressionDepth) / modularRatio;
    const centroid = (compressionBottom + concreteTop) / 2;

    return steelMoment + (area * (centroid - na));
  };

  let low = 0;
  let high = concreteTop;
  let lowValue = forceBalance(low);
  let highValue = forceBalance(high);

  if (lowValue === 0) {
    return low;
  }

  if (highValue === 0) {
    return high;
  }

  if (lowValue * highValue > 0) {
    const trialComponents = [
      ...steelComponents,
      ...rebarComponents,
      {
        area: (region.bEff * (concreteTop - concreteBottom)) / modularRatio,
        y: (concreteTop + concreteBottom) / 2,
      },
    ];

    const fallbackArea = trialComponents.reduce((sum, component) => sum + component.area, 0);
    const fallbackNa =
      trialComponents.reduce((sum, component) => sum + (component.area * component.y), 0) /
      Math.max(fallbackArea, EPSILON);
    return fallbackNa;
  }

  for (let i = 0; i < 120; i += 1) {
    const mid = (low + high) / 2;
    const midValue = forceBalance(mid);

    if (Math.abs(midValue) < 1e-8) {
      return mid;
    }

    if (lowValue * midValue <= 0) {
      high = mid;
      highValue = midValue;
    } else {
      low = mid;
      lowValue = midValue;
    }
  }

  return (low + high) / 2;
}

function computeCrackedNegative(region, modularRatio, bars) {
  const steelComponents = buildSteelComponents(region);
  const rebarComponents = [
    {
      name: 'Top reinforcement',
      area: bars.top.areaPerInch * region.bEff,
      y: bars.top.yCentroid,
      iLocal: 0,
    },
    {
      name: 'Bottom reinforcement',
      area: bars.bottom.areaPerInch * region.bEff,
      y: bars.bottom.yCentroid,
      iLocal: 0,
    },
  ];

  const neutralAxis = solveCrackedNeutralAxis(
    region,
    modularRatio,
    steelComponents,
    rebarComponents,
  );

  const concreteTop = region.D + region.tHaunch + region.tSlab;
  const concreteBottom = region.D;
  const compressionBottom = Math.max(neutralAxis, concreteBottom);
  const compressionDepth = Math.max(concreteTop - compressionBottom, 0);

  const components = [
    ...steelComponents,
    ...rebarComponents,
  ];

  if (compressionDepth > EPSILON) {
    components.push({
      name: 'Concrete in compression (cracked)',
      area: (region.bEff * compressionDepth) / modularRatio,
      y: (compressionBottom + concreteTop) / 2,
      iLocal: rectangleIxx(region.bEff, compressionDepth) / modularRatio,
    });
  }

  const iCracked = components.reduce((sum, component) => {
    const d = component.y - neutralAxis;
    return sum + (component.iLocal || 0) + (component.area * d ** 2);
  }, 0);

  return {
    neutralAxis,
    components,
    iCracked,
    sectionModulus: {
      topOfSteel: safeDivide(iCracked, Math.abs(region.D - neutralAxis)),
      bottomOfSteel: safeDivide(iCracked, Math.abs(neutralAxis)),
    },
    compressionDepth,
  };
}

function validateRegion(region) {
  const values = [
    region.D,
    region.tw,
    region.tfTop,
    region.bfTop,
    region.tfBot,
    region.bfBot,
    region.tHaunch,
    region.tSlab,
    region.bEff,
  ];

  return values.every((value) => Number(value) > 0);
}

export function getDefaultInput() {
  return {
    positiveSameAsNegative: true,
    topEqualsBottomFlange: true,
    materials: {
      Es: 29000,
      fc: 4,
      autoEc: true,
      EcManual: 3600,
    },
    negative: {
      D: 24,
      tw: 0.44,
      tfTop: 0.71,
      bfTop: 8,
      tfBot: 0.71,
      bfBot: 8,
      tHaunch: 2,
      tSlab: 5,
      bEff: 120,
      rebarTop: {
        barSize: '#5',
        spacing: 12,
        clearDistance: 1.5,
        alternatingBars: false,
        altBarSize: '#6',
        altSpacing: 12,
      },
      rebarBottom: {
        barSize: '#5',
        spacing: 12,
        clearDistance: 1.5,
        alternatingBars: false,
        altBarSize: '#6',
        altSpacing: 12,
      },
    },
    positive: {
      D: 24,
      tw: 0.44,
      tfTop: 0.71,
      bfTop: 8,
      tfBot: 0.71,
      bfBot: 8,
      tHaunch: 2,
      tSlab: 5,
      bEff: 120,
      rebarTop: {
        barSize: '#5',
        spacing: 12,
        clearDistance: 1.5,
        alternatingBars: false,
        altBarSize: '#6',
        altSpacing: 12,
      },
      rebarBottom: {
        barSize: '#5',
        spacing: 12,
        clearDistance: 1.5,
        alternatingBars: false,
        altBarSize: '#6',
        altSpacing: 12,
      },
    },
  };
}

export function getRebarOptions() {
  return Object.keys(REBAR_TABLE);
}

export function computeSectionProps(input) {
  const Ec = input.materials.autoEc
    ? 57 * Math.sqrt(input.materials.fc * 1000)
    : input.materials.EcManual;
  const modularRatio = input.materials.Es / Ec;

  const assumptions = [
    'Effective deck width b_eff is provided directly by the user; selected value should satisfy applicable code provisions.',
    'Clear distance is interpreted from concrete face to bar outside edge, then converted to centroid using bar radius.',
    `Ec ${input.materials.autoEc ? "computed from f'c using E_c = 57,000√(f'c × 1000 psi)" : 'set manually by user'}.`,
    'Cracked negative NA solved by binary search on transformed force equilibrium.',
  ];

  const regionsToRun = input.positiveSameAsNegative
    ? [{ key: 'both', label: 'Positive And Negative Region', data: input.negative }]
    : [
      { key: 'negative', label: 'Negative Region', data: input.negative },
      { key: 'positive', label: 'Positive Region', data: input.positive },
    ];

  const output = {
    materials: {
      Es: input.materials.Es,
      fc: input.materials.fc,
      Ec,
      n: modularRatio,
      n3: modularRatio * 3,
    },
    assumptions,
    regions: [],
    errors: [],
  };

  regionsToRun.forEach((regionConfig) => {
    const region = { ...regionConfig.data };

    if (input.topEqualsBottomFlange) {
      region.tfBot = region.tfTop;
      region.bfBot = region.bfTop;
    }

    region.bEff = Number(region.bEff);

    if (!validateRegion(region)) {
      output.errors.push(`Invalid inputs in ${regionConfig.label}. All geometric values must be positive.`);
      return;
    }

    const concreteTopY = region.D + region.tHaunch + region.tSlab;
    const concreteBottomY = region.D;

    const bars = {
      top: computeBarLayer(region.rebarTop, concreteBottomY, concreteTopY, true),
      bottom: computeBarLayer(region.rebarBottom, concreteBottomY, concreteTopY, false),
    };

    if (bars.top.assumption) {
      assumptions.push(`Top mat (${regionConfig.label}): ${bars.top.assumption}`);
    }

    if (bars.bottom.assumption) {
      assumptions.push(`Bottom mat (${regionConfig.label}): ${bars.bottom.assumption}`);
    }

    const steelOnly = summarizeSection(buildSteelComponents(region), {
      topOfSteel: region.D,
      bottomOfSteel: 0,
    });

    const compositeN = computeCompositeUncracked(region, modularRatio, bars, 'n');
    const composite3N = computeCompositeUncracked(region, modularRatio * 3, bars, '3n');
    const crackedNegative = computeCrackedNegative(region, modularRatio, bars);

    output.regions.push({
      key: regionConfig.key,
      label: regionConfig.label,
      region,
      bars,
      steelOnly,
      compositeN,
      composite3N,
      crackedNegative,
    });
  });

  output.assumptions = [...new Set(output.assumptions)];
  return output;
}
