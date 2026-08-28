export class ExerciseDefaultError extends Error {}

function nullableNumber(value, fieldName) {
  if (value === null || value === '') return null;

  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new ExerciseDefaultError(`${fieldName} must be a number or blank`);
  }
  return number;
}

function nullableText(value) {
  if (value === null || value === '') return null;
  return String(value);
}

/**
 * Replace the prefill values for one exercise variation and make that
 * variation the exercise's default. The exercise definition is copied so a
 * failed persistence attempt cannot mutate the object returned by Cosmos.
 */
export function withNewExerciseDefault(exercise, variationName, values) {
  if (!variationName || typeof variationName !== 'string') {
    throw new ExerciseDefaultError('variationName is required');
  }
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    throw new ExerciseDefaultError('values must be an object');
  }

  // A few old documents may still carry their targets directly on the exercise.
  // Promoting a default also upgrades that shape to the current variations model.
  const variations = Array.isArray(exercise.variations) && exercise.variations.length > 0
    ? exercise.variations
    : [{
        name: 'Standard',
        default: true,
        targetWeight: exercise.targetWeight ?? null,
        targetReps: exercise.targetReps ?? null,
        targetSets: exercise.targetSets ?? null,
      }];
  if (!variations.some((variation) => variation.name === variationName)) {
    throw new ExerciseDefaultError(`Unknown variation "${variationName}"`);
  }

  const updatedVariations = variations.map((variation) => {
    const selected = variation.name === variationName;
    const updated = { ...variation, default: selected };
    if (!selected) return updated;

    if (Array.isArray(variation.weightFields) && variation.weightFields.length > 0) {
      if (values.weights !== undefined) {
        if (!Array.isArray(values.weights)) {
          throw new ExerciseDefaultError('weights must be an array');
        }
        const weightsByKey = new Map(values.weights.map((entry) => [entry.key, entry.value]));
        updated.weightFields = variation.weightFields.map((field) => ({
          ...field,
          ...(weightsByKey.has(field.key) && {
            targetWeight: nullableNumber(weightsByKey.get(field.key), `${field.label || field.key} weight`),
          }),
        }));
      }
    } else if (values.weight !== undefined) {
      updated.targetWeight = nullableNumber(values.weight, 'weight');
    }

    if (values.inclineDegrees !== undefined && Object.hasOwn(variation, 'targetInclineDegrees')) {
      updated.targetInclineDegrees = nullableNumber(values.inclineDegrees, 'inclineDegrees');
    }
    if (values.reps !== undefined) {
      updated.targetReps = nullableText(values.reps);
    }
    if (values.sets !== undefined) {
      updated.targetSets = nullableNumber(values.sets, 'sets');
    }
    if (values.cableSetting !== undefined && Object.hasOwn(variation, 'cableSetting')) {
      updated.cableSetting = values.cableSetting === null ? '' : String(values.cableSetting);
    }

    return updated;
  });

  return {
    ...exercise,
    variations: updatedVariations,
    updatedAt: new Date().toISOString(),
  };
}
