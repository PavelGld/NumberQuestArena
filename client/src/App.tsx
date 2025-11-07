import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/components/LanguageProvider";
import Game from "@/pages/game";
import Constructor from "@/pages/constructor";
import CustomBoards from "@/pages/custom-boards";
import CustomGame from "@/pages/custom-game";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Game} />
      <Route path="/constructor" component={Constructor} />
      <Route path="/custom-boards" component={CustomBoards} />
      <Route path="/game/custom/:id" component={CustomGame} />
      <Route component={Game} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
