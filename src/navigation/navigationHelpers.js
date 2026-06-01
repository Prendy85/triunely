// src/navigation/navigationHelpers.js

export function navigateToAvailableRoute(navigation, screenName, params = {}) {
  if (!navigation || !screenName) {
    console.log("navigateToAvailableRoute missing navigation or screenName", {
      screenName,
    });
    return false;
  }

  const currentState = navigation.getState?.();
  const parentNavigation = navigation.getParent?.();
  const parentState = parentNavigation?.getState?.();
  const grandParentNavigation = parentNavigation?.getParent?.();
  const grandParentState = grandParentNavigation?.getState?.();

  if (currentState?.routeNames?.includes(screenName)) {
    navigation.navigate(screenName, params);
    return true;
  }

  if (parentState?.routeNames?.includes(screenName)) {
    parentNavigation.navigate(screenName, params);
    return true;
  }

  if (grandParentState?.routeNames?.includes(screenName)) {
    grandParentNavigation.navigate(screenName, params);
    return true;
  }

  console.log(`Route not found in visible navigators: ${screenName}`, {
    currentRouteNames: currentState?.routeNames,
    parentRouteNames: parentState?.routeNames,
    grandParentRouteNames: grandParentState?.routeNames,
  });

  return false;
}