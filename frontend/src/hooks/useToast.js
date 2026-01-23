import { useToast } from '../components/Toast'

// Re-export useToast from component to maintain backward compatibility if used elsewhere
// but now using the Context-based version
export { useToast }
export default useToast
