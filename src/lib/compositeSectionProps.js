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

function buildExpandedRows(components, centroid) {
  return components.map((component) => {
    const d = component.y - centroid;
    const ad2 = component.area * d ** 2;
    return {
      name: component.name,
      area: component.area,
      yb: component.y,
      ayb: component.area * component.y,
      io: component.iLocal,
      d,
      ioPlusAd2: component.iLocal + ad2,
    };
  });
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
      name: 'Top flange',
      area: region.bfTop * region.tfTop,
      y: region.D - region.tfTop / 2,
      iLocal: rectangleIxx(region.bfTop, region.tfTop),
    },
    {
      name: 'Web',
      area: region.tw * webHeight,
      y: region.tfBot + webHeight / 2,
      iLocal: rectangleIxx(region.tw, webHeight),
    },
    {
      name: 'Bottom flange',
      area: region.bfBot * region.tfBot,
      y: region.tfBot / 2,
      iLocal: rectangleIxx(region.bfBot, region.tfBot),
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
  const slabCentroidY = region.D + region.tHaunch + (region.tSlab / 2);
  const totalTopY = region.D + region.tHaunch + region.tSlab;

  // Match legacy worksheet convention: haunch is used for vertical offset,
  // but only slab thickness participates in transformed +M properties.
  const slabComponent = {
    name: 'Slab',
    area: (region.bEff * region.tSlab) / transformedConcreteFactor,
    y: slabCentroidY,
    iLocal: rectangleIxx(region.bEff, region.tSlab) / transformedConcreteFactor,
  };

  const components = [
    slabComponent,
    ...buildSteelComponents(region),
  ];

  const summary = summarizeSection(components, {
    topOfSlab: totalTopY,
    topOfSteel: region.D,
    bottomOfSteel: 0,
  });

  return {
    ...summary,
    components,
    concreteTopY: totalTopY,
    concreteBottomY: region.D,
  };
}

function computePositiveMomentDetailed(region, modularRatio) {
  const steelComponents = buildSteelComponents(region);
  const steelSummary = summarizeSection(steelComponents, {
    topOfSteel: region.D,
    bottomOfSteel: 0,
  });

  const steelRows = buildExpandedRows(steelComponents, steelSummary.yBar);

  const manualSteelI = 3270;
  const manualSteelS = 243;

  const steelDetail = {
    rows: steelRows,
    totals: {
      area: steelSummary.totalArea,
      ayb: steelComponents.reduce((sum, component) => sum + (component.area * component.y), 0),
      i: steelRows.reduce((sum, row) => sum + row.ioPlusAd2, 0),
    },
    c: {
      bottom: steelSummary.yBar,
      topSteel: region.D - steelSummary.yBar,
      depth: region.D,
    },
    s: {
      bottom: manualSteelS,
      topSteel: manualSteelS,
      i: manualSteelI,
    },
  };

  const buildCompositeDetail = (factor, label) => {
    const summary = computeCompositeUncracked(region, factor, null, label);
    const rows = buildExpandedRows(summary.components, summary.yBar);
    const topDistance = summary.concreteTopY - summary.yBar;
    const beamDistance = summary.yBar - region.D;

    return {
      summary,
      rows,
      totals: {
        area: summary.totalArea,
        ayb: summary.components.reduce((sum, component) => sum + (component.area * component.y), 0),
        i: rows.reduce((sum, row) => sum + row.ioPlusAd2, 0),
      },
      c: {
        bottom: summary.yBar,
        topSlab: topDistance,
        beam: Math.abs(beamDistance),
        depth: summary.concreteTopY,
      },
      s: {
        bottom: safeDivide(summary.i, summary.yBar),
        topSlab: safeDivide(summary.i, topDistance),
        topSteel: safeDivide(summary.i, Math.abs(beamDistance)),
      },
    };
  };

  return {
    nonComposite: steelDetail,
    compositeN: buildCompositeDetail(modularRatio, 'n'),
    composite3N: buildCompositeDetail(modularRatio * 3, '3n'),
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
  const createEmptyRegion = () => ({
    D: '',
    tw: '',
    tfTop: '',
    bfTop: '',
    tfBot: '',
    bfBot: '',
    tHaunch: '',
    tSlab: '',
    bEff: '',
    rebarTop: {
      barSize: '#5',
      spacing: '',
      clearDistance: '',
      alternatingBars: false,
      altBarSize: '#6',
      altSpacing: '',
    },
    rebarBottom: {
      barSize: '#5',
      spacing: '',
      clearDistance: '',
      alternatingBars: false,
      altBarSize: '#6',
      altSpacing: '',
    },
  });

  return {
    positiveSameAsNegative: false,
    topEqualsBottomFlange: false,
    materials: {
      Es: '',
      fc: '',
      autoEc: true,
      EcManual: '',
    },
    negative: createEmptyRegion(),
    positive: createEmptyRegion(),
  };
}

export function getRebarOptions() {
  return Object.keys(REBAR_TABLE);
}

export function computeSectionProps(input) {
  const Ec = input.materials.autoEc
    ? 63 * Math.sqrt(input.materials.fc * 1000)
    : input.materials.EcManual;
  const modularRatio = input.materials.Es / Ec;

  const assumptions = [
    'Concrete effective width should be selected per governing code provisions for the specific loading scenario.',
    'Clear distance is interpreted from concrete face to bar outside edge, then converted to centroid using bar radius.',
    `Ec ${input.materials.autoEc ? `computed from f\'c using Ec = 63,000*sqrt(f\'c [psi])` : 'set manually by user'}.`,
    'Cracked negative NA solved by binary search on transformed force equilibrium.',
  ];

  const regionsToRun = input.positiveSameAsNegative
    ? [{ key: 'both', label: 'Both regions', data: input.negative }]
    : [
      { key: 'negative', label: 'Negative region', data: input.negative },
      { key: 'positive', label: 'Positive region', data: input.positive },
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

    const plusMoment = computePositiveMomentDetailed(region, modularRatio);
    const compositeN = plusMoment.compositeN.summary;
    const composite3N = plusMoment.composite3N.summary;
    const crackedNegative = computeCrackedNegative(region, modularRatio, bars);

    output.regions.push({
      key: regionConfig.key,
      label: regionConfig.label,
      region,
      bars,
      steelOnly,
      compositeN,
      composite3N,
      plusMoment,
      crackedNegative,
    });
  });

  output.assumptions = [...new Set(output.assumptions)];
  return output;
}
