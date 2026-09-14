import { WalletProviderWrapper } from "./components/WalletProviderWrapper";
import { Dashboard } from "./components/Dashboard";

export default function App() {
  return (
    <WalletProviderWrapper>
      <Dashboard />
    </WalletProviderWrapper>
  );
}
