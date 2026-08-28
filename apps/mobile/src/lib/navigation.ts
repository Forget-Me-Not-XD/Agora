interface BackCapableNavigation {
  canGoBack: () => boolean;
  goBack: () => void;
}

// 'n Vinnige dubbele terug-druk (fisiese knoppie + skerm se eie terug-knoppie amper
// gelyktydig) kan 'n tweede GO_BACK afvuur nadat die stapel klaar leeg is, wat 'n
// "action not handled by any navigator" fout veroorsaak. canGoBack() maak seker
// ons net probeer terugstap as daar regtig iets is om na terug te gaan.
export function safeGoBack(navigation: BackCapableNavigation): void {
  if (navigation.canGoBack()) {
    navigation.goBack();
  }
}
