export function displayNameFromStored(stored) {
    if (!stored || typeof stored !== 'string') return stored;
    const name = stored.split('/').pop();
    const underscore = name.indexOf('_');
    return underscore > 0 && underscore < name.length - 1 ? name.substring(underscore + 1) : name;
}
