import "./index.css";
import { Composition } from "remotion";
import { durationInFrames, MyComposition } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LubricantScienceDouyin"
        component={MyComposition}
        durationInFrames={durationInFrames}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
