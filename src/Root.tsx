import "./index.css";
import { Composition } from "remotion";
import { FactVideoComposition, getSpecDuration } from "./Composition";
import { videoSpecs } from "./specs";

const registeredCompositions = videoSpecs.map((spec) => ({
	...spec,
	component: () => <FactVideoComposition spec={spec} />,
}));

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {registeredCompositions.map((spec) => (
        <Composition
          key={spec.compositionId}
          id={spec.compositionId}
          component={spec.component}
          durationInFrames={getSpecDuration(spec)}
          fps={spec.fps}
          width={spec.width}
          height={spec.height}
        />
      ))}
    </>
  );
};
