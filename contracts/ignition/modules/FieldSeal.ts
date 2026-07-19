import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const FieldSealModule = buildModule(
  "FieldSealModule",
  (moduleBuilder) => {
    const fieldSeal = moduleBuilder.contract("FieldSeal");

    return {
      fieldSeal,
    };
  },
);

export default FieldSealModule;