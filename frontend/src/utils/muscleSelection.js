// Draft-selection rules shared by the soreness muscle picker.
// A whole-group selection and specific muscles are alternative levels of detail.

export function toggleMuscleSelection(current, group, muscle, level = 1) {
  const selected = current.some((item) => item.group === group && item.muscle === muscle);
  if (selected) {
    return current.filter((item) => !(item.group === group && item.muscle === muscle));
  }

  const withoutConflicts = muscle === null
    ? current.filter((item) => item.group !== group)
    : current.filter((item) => !(item.group === group && item.muscle === null));

  return [...withoutConflicts, { group, muscle, level }];
}

export function toggleMuscleGroupSelection(current, group, level = 1) {
  if (current.some((item) => item.group === group)) {
    return current.filter((item) => item.group !== group);
  }

  return [...current, { group, muscle: null, level }];
}
