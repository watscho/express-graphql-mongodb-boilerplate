import { GraphQLError, Kind } from 'graphql'
import type {
  ValidationRule,
  SelectionSetNode,
  FragmentDefinitionNode
} from 'graphql'

// Expand fragment references per use, including aliases, before executing any resolver.
export const operationLimits =
  (maxDepth: number, maxFields: number): ValidationRule =>
  context => {
    const fragments = new Map<string, FragmentDefinitionNode>()
    for (const definition of context.getDocument().definitions)
      if (definition.kind === Kind.FRAGMENT_DEFINITION)
        fragments.set(definition.name.value, definition)
    return {
      OperationDefinition(node) {
        let fields = 0
        let rejected = false
        const scan = (
          set: SelectionSetNode,
          depth: number,
          trail: Set<string>
        ) => {
          for (const selection of set.selections) {
            if (rejected) return
            if (selection.kind === Kind.FIELD) {
              if (++fields > maxFields || depth > maxDepth) {
                rejected = true
                context.reportError(
                  new GraphQLError('graphql.operation_limit_exceeded', {
                    nodes: [node],
                    extensions: { code: 'OPERATION_LIMIT_EXCEEDED' }
                  })
                )
                return
              }
              if (selection.selectionSet)
                scan(selection.selectionSet, depth + 1, trail)
            } else if (selection.kind === Kind.INLINE_FRAGMENT)
              scan(selection.selectionSet, depth, trail)
            else {
              const name = selection.name.value
              const fragment = fragments.get(name)
              if (fragment && !trail.has(name))
                scan(fragment.selectionSet, depth, new Set([...trail, name]))
            }
          }
        }
        scan(node.selectionSet, 1, new Set())
      }
    }
  }
