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

function buildExpandedRows(components, referenceY) {
  return components.map((component) => {
    const d = Math.abs(component.y - referenceY);
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

function buildExpandedRowsWithTopReference(components, neutralAxisFromTop, topFiberY) {
  return components.map((component) => {
    const componentFromTop = topFiberY - component.y;
    const d = Math.abs(neutralAxisFromTop - componentFromTop);
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
      transformedAreaForBEff: 0,
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
      areaPerInch = (primary.area / spacing) + (secondary.area / altSpacing);
      diameter = 0.5 * (primary.diameter + secondary.diameter);
      assumption =
        'Alternating bars transformed with As/in = (A1/s1 + A2/s2).';
    }
  }

  const radius = diameter / 2;
  const yCentroid = isTopMat
    ? concreteTopY - (clearDistance + radius)
    : concreteBottomY + clearDistance + radius;

  return {
    areaPerInch,
    transformedAreaForBEff: 0,
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

function computePositiveMomentDetailed(region, modularRatio, bars) {
  const steelComponents = buildSteelComponents(region);
  const steelArea = steelComponents.reduce((sum, component) => sum + component.area, 0);
  const steelAYb = steelComponents.reduce((sum, component) => sum + (component.area * component.y), 0);
  const steelCb = steelAYb / Math.max(steelArea, EPSILON);
  const steelRows = buildExpandedRows(steelComponents, steelCb);
  const steelI = steelRows.reduce((sum, row) => sum + row.ioPlusAd2, 0);
  const steelCt = Math.abs(region.D - steelCb);

  const steelDetail = {
    rows: steelRows,
    totals: {
      area: steelArea,
      ayb: steelAYb,
      i: steelI,
    },
    c: {
      bottom: Math.abs(steelCb),
      topSteel: steelCt,
      depth: Math.abs(region.D),
    },
    s: {
      bottom: safeDivide(steelI, Math.abs(steelCb)),
      topSteel: safeDivide(steelI, steelCt),
      i: steelI,
    },
    i: steelI,
    yBar: Math.abs(steelCb),
    sectionModulus: {
      bottomOfSteel: safeDivide(steelI, Math.abs(steelCb)),
      topOfSteel: safeDivide(steelI, steelCt),
    },
  };

  const buildCompositeDetail = (factor, label) => {
    const summary = computeCompositeUncracked(region, factor, null, label);
    const area = summary.components.reduce((sum, component) => sum + component.area, 0);
    const ayb = summary.components.reduce((sum, component) => sum + (component.area * component.y), 0);
    const cb = ayb / Math.max(area, EPSILON);
    const hc = summary.concreteTopY;
    const ctSlab = Math.abs(hc - cb);
    const ctBeam = Math.abs(ctSlab - region.tHaunch - region.tSlab);
    const rows = buildExpandedRowsWithTopReference(summary.components, ctSlab, hc);
    const i = rows.reduce((sum, row) => sum + row.ioPlusAd2, 0);

    return {
      rows,
      totals: {
        area,
        ayb,
        i,
      },
      c: {
        bottom: Math.abs(cb),
        topSlab: ctSlab,
        beam: ctBeam,
        depth: Math.abs(hc),
      },
      s: {
        bottom: safeDivide(i, Math.abs(cb)),
        topSlab: safeDivide(i, ctSlab),
        topSteel: safeDivide(i, ctBeam),
      },
      i,
      yBar: Math.abs(cb),
      sectionModulus: {
        bottomOfSteel: safeDivide(i, Math.abs(cb)),
        topOfSlab: safeDivide(i, ctSlab),
        topOfSteel: safeDivide(i, ctBeam),
      },
    };
  };

  return {
    nonComposite: steelDetail,
    compositeN: buildCompositeDetail(modularRatio, 'n'),
    composite3N: buildCompositeDetail(modularRatio * 3, '3n'),
    compositeCr: (() => {
      const crackedComponents = [
        {
          name: 'Top slab reinforcement',
          area: bars.top.transformedAreaForBEff,
          y: bars.top.yCentroid,
          iLocal: 0,
        },
        {
          name: 'Bottom slab reinforcement',
          area: bars.bottom.transformedAreaForBEff,
          y: bars.bottom.yCentroid,
          iLocal: 0,
        },
        ...steelComponents,
      ];

      const summary = summarizeSection(crackedComponents, {
        topOfSlab: region.D + region.tHaunch + region.tSlab,
        topOfSteel: region.D,
        bottomOfSteel: 0,
      });

      const area = crackedComponents.reduce((sum, component) => sum + component.area, 0);
      const ayb = crackedComponents.reduce((sum, component) => sum + (component.area * component.y), 0);
      const cb = ayb / Math.max(area, EPSILON);
      const hc = region.D + region.tHaunch + region.tSlab;
      const ctSlab = Math.abs(hc - cb);
      const ctBeam = Math.abs(ctSlab - region.tHaunch - region.tSlab);
      const rows = buildExpandedRowsWithTopReference(crackedComponents, ctSlab, hc);
      const i = rows.reduce((sum, row) => sum + row.ioPlusAd2, 0);

      return {
        ...summary,
        rows,
        totals: {
          area,
          ayb,
          i,
        },
        c: {
          bottom: Math.abs(cb),
          topSlab: ctSlab,
          beam: ctBeam,
          depth: Math.abs(hc),
        },
        s: {
          bottom: safeDivide(i, Math.abs(cb)),
          topSlab: safeDivide(i, ctSlab),
          topSteel: safeDivide(i, ctBeam),
        },
        i,
        yBar: Math.abs(cb),
        sectionModulus: {
          bottomOfSteel: safeDivide(i, Math.abs(cb)),
          topOfSlab: safeDivide(i, ctSlab),
          topOfSteel: safeDivide(i, ctBeam),
        },
      };
    })(),
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
    aiscManualShape: {
      Ix: '',
      Sx: '',
    },
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
  ];

  const regionsToRun = input.positiveSameAsNegative
    ? [{ key: 'both', label: 'Positive and Negative Region', data: input.negative }]
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

    bars.top.transformedAreaForBEff = bars.top.areaPerInch * region.bEff;
    bars.bottom.transformedAreaForBEff = bars.bottom.areaPerInch * region.bEff;

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

    const useAiscManual = input.topEqualsBottomFlange
      && Number.isFinite(input.aiscManualShape?.Ix)
      && Number.isFinite(input.aiscManualShape?.Sx)
      && input.aiscManualShape.Ix > 0
      && input.aiscManualShape.Sx > 0;

    const steelOnlyDisplay = useAiscManual
      ? {
          i: input.aiscManualShape.Ix,
          topOfSteel: input.aiscManualShape.Sx,
          bottomOfSteel: input.aiscManualShape.Sx,
        }
      : null;

    const plusMoment = computePositiveMomentDetailed(region, modularRatio, bars);
    const compositeN = plusMoment.compositeN;
    const composite3N = plusMoment.composite3N;
    const compositeCr = plusMoment.compositeCr;

    output.regions.push({
      key: regionConfig.key,
      label: regionConfig.label,
      region,
      bars,
      steelOnly,
      steelOnlyDisplay,
      useAiscManual,
      compositeN,
      composite3N,
      compositeCr,
      plusMoment,
    });
  });

  output.assumptions = [...new Set(output.assumptions)];
  return output;
}
